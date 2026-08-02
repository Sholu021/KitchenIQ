from datetime import date
from pydantic import BaseModel
from typing import List


class ReceivePurchaseOrderItem(BaseModel):
    purchase_order_item_id: int
    quantity: float
    batch_number: str
    expiry_date: date


class ReceivePurchaseOrderRequest(BaseModel):
    items: List[ReceivePurchaseOrderItem]