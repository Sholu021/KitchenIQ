import os
import json
from datetime import date, datetime, timedelta, UTC
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Product, Batch, Sale, SaleItem, Recipe, Supplier
from app.schemas.schemas import AIInsightsResponse

# Try importing OpenAI safely
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "mock")

def get_openai_client():
    if not OPENAI_API_KEY or OPENAI_API_KEY.strip().lower() == "mock":
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        return None


def serialize_kitchen_state(db: Session, organization_id: int) -> Dict[str, Any]:
    """Serializes the current database state of the kitchen for AI consumption."""
    # 1. Products
    products = db.query(Product).filter(Product.organization_id == organization_id).all()
    products_data = []
    for p in products:
        products_data.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "unit": p.unit,
            "current_stock": p.current_stock,
            "reorder_level": p.reorder_level,
            "cost_price": p.cost_price,
            "selling_price": p.selling_price
        })

    # 2. Batches (expiring / active)
    batches = db.query(Batch).filter(
        Batch.organization_id == organization_id,
        Batch.remaining_quantity > 0
    ).all()
    batches_data = []
    for b in batches:
        batches_data.append({
            "product_name": b.product.name if b.product else "Unknown",
            "batch_number": b.batch_number,
            "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
            "quantity": b.remaining_quantity
        })

    # 3. Recent Sales (last 30 days)
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    sales = db.query(Sale).filter(
        Sale.organization_id == organization_id,
        Sale.sale_date >= thirty_days_ago
    ).all()
    sales_data = []
    for s in sales:
        sales_data.append({
            "date": s.sale_date.isoformat(),
            "amount": s.total_amount,
            "items": [{"recipe_name": item.recipe.name if item.recipe else "Unknown", "quantity": item.quantity} for item in s.items]
        })

    return {
        "products": products_data,
        "active_batches": batches_data,
        "recent_sales_30_days": sales_data,
        "current_date": date.today().isoformat()
    }


def generate_mock_insights(db: Session, organization_id: int) -> Dict[str, Any]:
    """Generates highly realistic, data-driven insights locally when OpenAI is disabled."""
    state = serialize_kitchen_state(db, organization_id)
    products = state["products"]
    batches = state["active_batches"]
    
    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)

    # Calculate metrics
    low_stock = [p for p in products if p["current_stock"] <= p["reorder_level"]]
    out_of_stock = [p for p in products if p["current_stock"] == 0]
    
    expired_batches = []
    expiring_soon_batches = []  # < 7 days
    expiring_month_batches = []  # < 30 days
    
    for b in batches:
        if not b["expiry_date"]:
            continue
        exp_date = date.fromisoformat(b["expiry_date"])
        if exp_date < today:
            expired_batches.append(b)
        elif exp_date <= in_7_days:
            expiring_soon_batches.append(b)
        elif exp_date <= in_30_days:
            expiring_month_batches.append(b)

    # 1. Health Summary
    waste_risk_cost = sum(b["quantity"] * next((p["cost_price"] for p in products if p["name"] == b["product_name"]), 0.0) for b in expired_batches + expiring_soon_batches)
    
    health_status = "Good"
    if out_of_stock or expired_batches:
        health_status = "Critical"
    elif low_stock or expiring_soon_batches:
        health_status = "Warning"
        
    summary_text = (
        f"KitchenIQ Health is currently evaluated as '{health_status}'. "
        f"We found {len(out_of_stock)} items completely out of stock, {len(low_stock)} items below reorder thresholds, "
        f"and {len(expired_batches)} expired batches requiring disposal."
    )
    if expiring_soon_batches:
        summary_text += f" There are {len(expiring_soon_batches)} batches expiring in the next 7 days, representing a waste risk of ${waste_risk_cost:.2f}."

    recommendations = []
    if out_of_stock:
        names = ", ".join([p["name"] for p in out_of_stock[:3]])
        recommendations.append(f"Immediate Action: Replenish out-of-stock items: {names}.")
    if expiring_soon_batches:
        names = ", ".join([f"{b['product_name']} (Qty: {b['quantity']})" for b in expiring_soon_batches[:2]])
        recommendations.append(f"Waste Prevention: Prioritize usage of expiring batches: {names}.")
    if low_stock:
        names = ", ".join([p["name"] for p in low_stock[:3]])
        recommendations.append(f"Inventory Health: Create Purchase Orders for low-stock items: {names}.")
    if not recommendations:
        recommendations.append("All stock levels are optimal. Continue monitoring weekly trends.")

    health_summary = {
        "status": health_status,
        "summary": summary_text,
        "recommendations": recommendations,
        "waste_risk_value": round(waste_risk_cost, 2)
    }

    # 2. Reorder Suggestions
    reorder_suggestions = []
    for p in low_stock:
        suggested_qty = max(p["reorder_level"] * 2 - p["current_stock"], 10.0)
        # Round to whole numbers for pcs, decimal for volume/mass
        if p["unit"].lower() == "pcs":
            suggested_qty = float(int(suggested_qty))
        
        priority = "MEDIUM"
        if p["current_stock"] == 0:
            priority = "HIGH"
            
        reorder_suggestions.append({
            "product_id": p["id"],
            "product_name": p["name"],
            "current_stock": p["current_stock"],
            "reorder_level": p["reorder_level"],
            "suggested_quantity": suggested_qty,
            "unit": p["unit"],
            "priority": priority,
            "estimated_cost": round(suggested_qty * p["cost_price"], 2),
            "reason": f"Stock is {p['current_stock']} {p['unit']}, which is below the reorder level of {p['reorder_level']} {p['unit']}."
        })

    # 3. Waste Analysis
    dead_stock = []
    # Identify items with stock but no sales in the last 30 days
    sold_product_names = set()
    for s in state["recent_sales_30_days"]:
        for item in s["items"]:
            # Recipes sold. We need to check what ingredients are in these recipes.
            # For mock simplicity, let's just make a mock list of slow moving items based on current stock high values.
            pass

    # A simple heuristic for slow moving stock (stock > 50 and selling_price > 0)
    for p in products:
        if p["current_stock"] > p["reorder_level"] * 3 and p["current_stock"] > 20:
            dead_stock.append({
                "product_name": p["name"],
                "current_stock": p["current_stock"],
                "unit": p["unit"],
                "value": round(p["current_stock"] * p["cost_price"], 2),
                "reason": "High stock level with low relative monthly velocity."
            })

    waste_analysis = {
        "expired_batches_value": round(sum(b["quantity"] * next((p["cost_price"] for p in products if p["name"] == b["product_name"]), 0.0) for b in expired_batches), 2),
        "expiring_30_days_value": round(sum(b["quantity"] * next((p["cost_price"] for p in products if p["name"] == b["product_name"]), 0.0) for b in expiring_month_batches), 2),
        "expired_items_list": expired_batches[:5],
        "dead_stock_recommendations": dead_stock[:3]
    }

    return {
        "health_summary": health_summary,
        "reorder_suggestions": reorder_suggestions,
        "waste_analysis": waste_analysis,
        "timestamp": datetime.now(UTC)
    }


def get_ai_insights(db: Session, organization_id: int) -> Dict[str, Any]:
    """Generates all AI Insights: Health Summary, Reorder suggestions, and Waste reports."""
    client = get_openai_client()
    if not client:
        return generate_mock_insights(db, organization_id)

    try:
        # Load state and call OpenAI
        state = serialize_kitchen_state(db, organization_id)
        
        prompt = (
            "You are KitchenIQ, a restaurant inventory intelligence assistant.\n"
            "Analyze the following JSON snapshot representing a food business's current inventory, batches, and sales history.\n"
            f"State JSON:\n{json.dumps(state, indent=2)}\n\n"
            "Return a JSON object matching this schema exactly:\n"
            "{\n"
            "  \"health_summary\": {\n"
            "    \"status\": \"Good | Warning | Critical\",\n"
            "    \"summary\": \"Detailed string analyzing stock status, expiry risks, etc.\",\n"
            "    \"recommendations\": [\"rec 1\", \"rec 2\", ...],\n"
            "    \"waste_risk_value\": float_value\n"
            "  },\n"
            "  \"reorder_suggestions\": [\n"
            "    {\n"
            "      \"product_id\": int,\n"
            "      \"product_name\": \"string\",\n"
            "      \"current_stock\": float,\n"
            "      \"reorder_level\": float,\n"
            "      \"suggested_quantity\": float,\n"
            "      \"unit\": \"string\",\n"
            "      \"priority\": \"HIGH | MEDIUM | LOW\",\n"
            "      \"estimated_cost\": float,\n"
            "      \"reason\": \"string\"\n"
            "    }\n"
            "  ],\n"
            "  \"waste_analysis\": {\n"
            "    \"expired_batches_value\": float_value,\n"
            "    \"expiring_30_days_value\": float_value,\n"
            "    \"expired_items_list\": [ ... ],\n"
            "    \"dead_stock_recommendations\": [\n"
            "       { \"product_name\": \"string\", \"current_stock\": float, \"unit\": \"string\", \"value\": float, \"reason\": \"string\" }\n"
            "    ]\n"
            "  }\n"
            "}\n"
            "Return ONLY the valid JSON, no markdown code block formatting."
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # fallback to standard model for cost & speed
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response.choices[0].message.content)
        data["timestamp"] = datetime.now(UTC)
        return data

    except Exception as e:
        print(f"Error calling OpenAI API: {e}. Falling back to mock engine.")
        return generate_mock_insights(db, organization_id)


def ask_ai_copilot(db: Session, organization_id: int, question: str) -> str:
    """Answers natural language questions about the inventory using data snapshots."""
    client = get_openai_client()
    state = serialize_kitchen_state(db, organization_id)

    if not client:
        # Smart Local Search Mock Engine
        q = question.lower()
        products = state["products"]
        batches = state["active_batches"]
        
        low_stock_names = [p["name"] for p in products if p["current_stock"] <= p["reorder_level"]]
        out_of_stock_names = [p["name"] for p in products if p["current_stock"] == 0]
        
        today = date.today()
        expiring_batches = []
        for b in batches:
            if not b["expiry_date"]:
                continue
            exp_date = date.fromisoformat(b["expiry_date"])
            if exp_date < today or exp_date <= today + timedelta(days=7):
                expiring_batches.append(f"{b['product_name']} (Batch: {b['batch_number']}, Expires: {b['expiry_date']})")

        # 1. Answer reorder questions
        if "reorder" in q or "buy" in q or "purchase" in q:
            if not low_stock_names:
                return "Good news! All inventory levels are above reorder thresholds. There is no immediate need to reorder anything."
            return f"You should reorder: {', '.join(low_stock_names)}. These items have fallen below their reorder safety thresholds."
            
        # 2. Answer running out questions
        elif "run out" in q or "depleted" in q or "empty" in q:
            if not out_of_stock_names and not low_stock_names:
                return "No items are currently running out. Stock levels are stable."
            out_str = f"completely empty: {', '.join(out_of_stock_names)}" if out_of_stock_names else ""
            low_str = f"running low: {', '.join(low_stock_names)}" if low_stock_names else ""
            connector = " and " if (out_str and low_str) else ""
            return f"The following items are {out_str}{connector}{low_str}. Consider placing a supplier order soon."

        # 3. Answer expiring soon questions
        elif "expire" in q or "expiry" in q or "spoil" in q:
            if not expiring_batches:
                return "We scanned your active batches and found no products expired or expiring within the next 7 days."
            return f"The following batches are expired or expiring this week:\n" + "\n".join([f"- {b}" for b in expiring_batches[:5]])

        # 4. Answer waste questions
        elif "waste" in q or "loss" in q or "dead" in q:
            expired_cost = sum(b["quantity"] * next((p["cost_price"] for p in products if p["name"] == b["product_name"]), 0.0) for b in batches if b["expiry_date"] and date.fromisoformat(b["expiry_date"]) < today)
            return (
                f"Currently, expired inventory accounts for about ${expired_cost:.2f} in potential waste. "
                "You can reduce food waste by designing recipes using expiring dairy/produce or utilizing FEFO rotation in kitchen prep."
            )

        # 5. Default Copilot Fallback response
        return (
            f"Hello! I am your KitchenIQ Copilot. I have analyzed your inventory containing {len(products)} active products. "
            f"Currently, {len(low_stock_names)} items are low stock, and there are {len(expiring_batches)} batches expiring soon. "
            "You can ask me questions like: 'What should I reorder?', 'Which items are expiring?', or 'What will run out this week?'"
        )

    # If OpenAI is active
    try:
        prompt = (
            "You are KitchenIQ Copilot, an AI chat assistant for a commercial kitchen's manager.\n"
            "Answer the user's question about their kitchen inventory using the following state data.\n"
            "Give direct, concise, and helpful answers. If calculations are needed, explain briefly.\n\n"
            f"Kitchen Data:\n{json.dumps(state, indent=2)}\n\n"
            f"User Question: {question}\n"
            "Answer:"
        )
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error connecting to AI Copilot: {e}. Please try again later."

def generate_ai_insights(
    db: Session,
    organization_id: int,
):
    pass