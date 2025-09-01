"""
Movements management router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import MovementCreate, MovementResponse
from services import MovementService, StockService

router = APIRouter()

@router.post("/", response_model=MovementResponse, status_code=201)
async def create_movement(
    movement_data: MovementCreate,
    db: Session = Depends(get_db)
):
    """Create a new movement (purchase or sale)"""
    try:
        # Validate stock exists
        stock = StockService.get_stock(db, movement_data.stock_id)
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        # For sales, check if enough stock is available
        if movement_data.movement_type == "sale":
            if stock.quantity < movement_data.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock. Available: {stock.quantity}, Requested: {movement_data.quantity}"
                )
        
        movement = MovementService.create_movement(db, movement_data)
        return movement
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[MovementResponse])
async def get_all_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all movements with pagination"""
    movements = MovementService.get_movements(db, skip=skip, limit=limit)
    return movements

@router.get("/stock/{stock_id}", response_model=List[MovementResponse])
async def get_movements_by_stock(
    stock_id: int,
    db: Session = Depends(get_db)
):
    """Get movements for a specific stock"""
    # Validate stock exists
    stock = StockService.get_stock(db, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    movements = MovementService.get_movements_by_stock(db, stock_id)
    return movements

@router.get("/type/{movement_type}", response_model=List[MovementResponse])
async def get_movements_by_type(
    movement_type: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get movements by type (purchase or sale)"""
    if movement_type not in ["purchase", "sale"]:
        raise HTTPException(
            status_code=400,
            detail="Movement type must be 'purchase' or 'sale'"
        )
    
    from database import Movement
    movements = db.query(Movement).filter(
        Movement.movement_type == movement_type
    ).order_by(Movement.date.desc()).offset(skip).limit(limit).all()
    
    return movements

@router.post("/purchase", response_model=MovementResponse, status_code=201)
async def create_purchase(
    stock_id: int,
    quantity: int = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Create a purchase movement (add stock)"""
    # Validate stock exists
    stock = StockService.get_stock(db, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    movement_data = MovementCreate(
        stock_id=stock_id,
        movement_type="purchase",
        quantity=quantity
    )
    
    try:
        movement = MovementService.create_movement(db, movement_data)
        return movement
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sale", response_model=MovementResponse, status_code=201)
async def create_sale(
    stock_id: int,
    quantity: int = Query(..., gt=0),
    discount_percent: float = Query(0.0, ge=0.0, le=100.0),
    db: Session = Depends(get_db)
):
    """Create a sale movement (remove stock)"""
    # Validate stock exists
    stock = StockService.get_stock(db, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    # Check if enough stock is available
    if stock.quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuffisant. Disponible: {stock.quantity}, Demandé: {quantity}"
        )
    
    movement_data = MovementCreate(
        stock_id=stock_id,
        movement_type="sale",
        quantity=quantity,
        discount_percent=discount_percent
    )
    
    try:
        movement = MovementService.create_movement(db, movement_data)
        return movement
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


