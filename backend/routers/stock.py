"""
Stock management router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import StockCreate, StockUpdate, StockResponse
from services import StockService

router = APIRouter()

@router.post("/", response_model=StockResponse, status_code=201)
async def create_stock(
    stock_data: StockCreate,
    db: Session = Depends(get_db)
):
    """Create a new stock item"""
    try:
        # Check if reference already exists
        existing_stock = StockService.get_stock_by_reference(db, stock_data.reference)
        if existing_stock:
            raise HTTPException(
                status_code=400,
                detail=f"Stock with reference '{stock_data.reference}' already exists"
            )
        
        stock = StockService.create_stock(db, stock_data)
        return stock
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[StockResponse])
async def get_all_stock(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all stock items with pagination"""
    stock_items = StockService.get_all_stock(db, skip=skip, limit=limit)
    return stock_items

@router.get("/{stock_id}", response_model=StockResponse)
async def get_stock(stock_id: int, db: Session = Depends(get_db)):
    """Get stock by ID"""
    stock = StockService.get_stock(db, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.get("/reference/{reference}", response_model=StockResponse)
async def get_stock_by_reference(reference: str, db: Session = Depends(get_db)):
    """Get stock by reference"""
    stock = StockService.get_stock_by_reference(db, reference)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.put("/{stock_id}", response_model=StockResponse)
async def update_stock(
    stock_id: int,
    stock_data: StockUpdate,
    db: Session = Depends(get_db)
):
    """Update stock item"""
    stock = StockService.update_stock(db, stock_id, stock_data)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.delete("/{stock_id}", status_code=204)
async def delete_stock(stock_id: int, db: Session = Depends(get_db)):
    """Delete stock item"""
    success = StockService.delete_stock(db, stock_id)
    if not success:
        raise HTTPException(status_code=404, detail="Stock not found")
    return None

@router.get("/low-stock/", response_model=List[StockResponse])
async def get_low_stock_items(
    threshold: int = Query(10, ge=1, description="Minimum quantity threshold"),
    db: Session = Depends(get_db)
):
    """Get stock items with quantity below threshold"""
    from database import Stock
    low_stock = db.query(Stock).filter(Stock.quantity < threshold).all()
    return low_stock


