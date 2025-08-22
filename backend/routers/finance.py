"""
Finance management router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from database import get_db
from schemas import FinanceResponse
from services import FinanceService

router = APIRouter()

@router.get("/sales", response_model=List[FinanceResponse])
async def get_all_sales(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all sales with pagination"""
    sales = FinanceService.get_all_sales(db, skip=skip, limit=limit)
    return sales

@router.get("/sales/date-range", response_model=List[FinanceResponse])
async def get_sales_by_date_range(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Get sales within a date range"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)  # Include end date
        
        if start > end:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before end date"
            )
        
        sales = FinanceService.get_sales_by_date_range(db, start, end)
        return sales
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD"
        )

@router.get("/sales/this-month", response_model=List[FinanceResponse])
async def get_sales_this_month(db: Session = Depends(get_db)):
    """Get sales for the current month"""
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    end_of_month = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
    
    sales = FinanceService.get_sales_by_date_range(db, start_of_month, end_of_month)
    return sales

@router.get("/sales/this-week", response_model=List[FinanceResponse])
async def get_sales_this_week(db: Session = Depends(get_db)):
    """Get sales for the current week"""
    now = datetime.utcnow()
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)
    
    sales = FinanceService.get_sales_by_date_range(db, start_of_week, end_of_week)
    return sales

@router.get("/revenue/total")
async def get_total_revenue(db: Session = Depends(get_db)):
    """Get total revenue"""
    total = FinanceService.get_total_revenue(db)
    return {"total_revenue": total}

@router.get("/revenue/monthly")
async def get_monthly_revenue(
    year: int = Query(..., description="Year"),
    db: Session = Depends(get_db)
):
    """Get monthly revenue for a specific year"""
    from database import Finance
    from sqlalchemy import func, extract
    
    monthly_revenue = db.query(
        extract('month', Finance.date).label('month'),
        func.sum(Finance.total_revenue).label('revenue')
    ).filter(
        extract('year', Finance.date) == year
    ).group_by(
        extract('month', Finance.date)
    ).order_by('month').all()
    
    # Format as monthly data
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    revenue_data = {month: 0.0 for month in months}
    
    for month, revenue in monthly_revenue:
        revenue_data[int(month)] = float(revenue)
    
    return {
        "year": year,
        "monthly_revenue": revenue_data
    }

@router.get("/discounts/average")
async def get_average_discount(db: Session = Depends(get_db)):
    """Get average discount percentage"""
    average = FinanceService.get_average_discount(db)
    return {"average_discount_percent": average}

@router.get("/best-sellers")
async def get_best_sellers(
    limit: int = Query(10, ge=1, le=50, description="Number of top sellers to return"),
    db: Session = Depends(get_db)
):
    """Get best selling items"""
    from database import Finance, Stock
    from sqlalchemy import func
    
    best_sellers = db.query(
        Stock.name,
        func.sum(Finance.quantity_sold).label('total_sold'),
        func.sum(Finance.total_revenue).label('total_revenue')
    ).join(
        Finance, Stock.id == Finance.stock_id
    ).group_by(
        Stock.id, Stock.name
    ).order_by(
        func.sum(Finance.quantity_sold).desc()
    ).limit(limit).all()
    
    return [
        {
            "item_name": name,
            "total_quantity_sold": int(total_sold),
            "total_revenue": float(total_revenue)
        }
        for name, total_sold, total_revenue in best_sellers
    ]


