"""
Pydantic schemas for data validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Stock schemas
class StockBase(BaseModel):
    reference: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    unit_price: float = Field(..., gt=0)

class StockCreate(StockBase):
    quantity: int = Field(default=0, ge=0)

class StockUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    unit_price: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=0)

class StockResponse(StockBase):
    id: int
    quantity: int
    total_value: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Movement schemas
class MovementBase(BaseModel):
    stock_id: int
    movement_type: str = Field(..., pattern="^(purchase|sale)$")
    quantity: int = Field(..., gt=0)
    discount_percent: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)

class MovementCreate(MovementBase):
    date: Optional[datetime] = None

class MovementResponse(MovementBase):
    id: int
    date: datetime
    created_at: datetime
    stock: StockResponse
    
    class Config:
        from_attributes = True

# Finance schemas
class FinanceBase(BaseModel):
    stock_id: int
    quantity_sold: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    price_after_discount: float = Field(..., gt=0)
    total_revenue: float = Field(..., gt=0)

class FinanceCreate(FinanceBase):
    date: Optional[datetime] = None

class FinanceResponse(FinanceBase):
    id: int
    date: datetime
    created_at: datetime
    stock: StockResponse
    
    class Config:
        from_attributes = True

# Report schemas
class StockSummary(BaseModel):
    total_items: int
    total_value: float
    low_stock_items: int

class FinancialSummary(BaseModel):
    total_revenue: float
    total_sales: int
    average_discount: float
    best_selling_item: Optional[str]

class DashboardData(BaseModel):
    stock_summary: StockSummary
    financial_summary: FinancialSummary
    recent_movements: List[MovementResponse]
    recent_sales: List[FinanceResponse]
