from datetime import date
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class SupplierInvoiceCreate(BaseModel):
    purchase_order_id: int
    invoice_number: str
    invoice_date: date
    invoice_amount: float


class SupplierInvoiceOut(BaseModel):
    id: int
    purchase_order_id: int
    supplier_id: int
    invoice_number: str
    invoice_date: date
    invoice_amount: float
    status: str

    model_config = ConfigDict(from_attributes=True)