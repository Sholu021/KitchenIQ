# KitchenIQ

AI-powered ERP and Inventory Management System for Restaurants, Cafés, Bakeries, and Cloud Kitchens.

## Features

### Inventory
- Batch Management
- FEFO Inventory
- Inventory Ledger
- Inventory Valuation
- Inventory Health
- ABC Analysis
- Low Stock Alerts
- Expiry Tracking

### Purchasing
- Purchase Orders
- Approval Workflow
- Supplier Performance
- Supplier Invoices
- AI Reorder Suggestions

### Production
- Recipes
- Production Runs
- Yield Management
- Finished Goods

### Sales
- Sales Management
- Profit Tracking
- Revenue Analytics
- Top Products

### AI
- AI Copilot
- AI Insights
- Demand Forecasting
- Automatic Reordering

### Reports
- Executive Dashboard
- PDF Reports
- Excel Reports
- Scheduled Reports

---

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL
- Alembic
- APScheduler
- JWT Authentication

### Frontend
- Next.js
- React
- TailwindCSS

### AI
- OpenAI
- AI Gateway

---

## Project Structure

```
KitchenIQ/
│
├── backend/
├── frontend/
├── ai-gateway/
└── README.md
```

---

## Running Locally

Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

AI Gateway

```bash
cd ai-gateway
npm install
npm run dev
```

---

## Status

Current development stage:

- Backend API
- Frontend Dashboard
- AI Gateway
- Automated Reporting
- Production Module

All backend tests are currently passing.