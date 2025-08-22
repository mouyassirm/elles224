"""
Reports and dashboard router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from database import get_db
from schemas import DashboardData, StockSummary, FinancialSummary
from services import ReportService, StockService, FinanceService

router = APIRouter()

@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(db: Session = Depends(get_db)):
    """Get complete dashboard data"""
    try:
        dashboard_data = ReportService.get_dashboard_data(db)
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard: {str(e)}")

@router.get("/stock/summary", response_model=StockSummary)
async def get_stock_summary(db: Session = Depends(get_db)):
    """Get stock summary statistics"""
    try:
        summary = ReportService.get_stock_summary(db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating stock summary: {str(e)}")

@router.get("/finance/summary", response_model=FinancialSummary)
async def get_financial_summary(db: Session = Depends(get_db)):
    """Get financial summary statistics"""
    try:
        summary = ReportService.get_financial_summary(db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating financial summary: {str(e)}")

@router.get("/stock/value-distribution")
async def get_stock_value_distribution(db: Session = Depends(get_db)):
    """Get stock value distribution for charts"""
    from database import Stock
    from sqlalchemy import func
    
    # Get stock items with their values
    stock_values = db.query(
        Stock.name,
        Stock.total_value
    ).filter(
        Stock.total_value > 0
    ).order_by(
        Stock.total_value.desc()
    ).all()
    
    return {
        "labels": [item.name for item in stock_values],
        "values": [float(item.total_value) for item in stock_values]
    }

@router.get("/sales/trend")
async def get_sales_trend(
    period: str = Query("month", description="Period: week, month, year"),
    db: Session = Depends(get_db)
):
    """Get sales trend data for charts"""
    from database import Finance
    from sqlalchemy import func, extract
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    
    if period == "week":
        # Last 4 weeks
        data_points = []
        for i in range(4):
            week_start = now - timedelta(weeks=i+1)
            week_end = week_start + timedelta(weeks=1)
            
            revenue = db.query(func.sum(Finance.total_revenue)).filter(
                Finance.date >= week_start,
                Finance.date < week_end
            ).scalar() or 0.0
            
            data_points.append({
                "period": f"Week {4-i}",
                "revenue": float(revenue)
            })
        
        return {"trend_data": list(reversed(data_points))}
    
    elif period == "month":
        # Last 6 months
        data_points = []
        for i in range(6):
            month = now.month - i - 1
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            
            revenue = db.query(func.sum(Finance.total_revenue)).filter(
                extract('year', Finance.date) == year,
                extract('month', Finance.date) == month
            ).scalar() or 0.0
            
            data_points.append({
                "period": f"{year}-{month:02d}",
                "revenue": float(revenue)
            })
        
        return {"trend_data": list(reversed(data_points))}
    
    elif period == "year":
        # Last 5 years
        data_points = []
        for i in range(5):
            year = now.year - i - 1
            
            revenue = db.query(func.sum(Finance.total_revenue)).filter(
                extract('year', Finance.date) == year
            ).scalar() or 0.0
            
            data_points.append({
                "period": str(year),
                "revenue": float(revenue)
            })
        
        return {"trend_data": list(reversed(data_points))}
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Period must be 'week', 'month', or 'year'"
        )

@router.get("/stock/quantity-alerts")
async def get_quantity_alerts(
    threshold: int = Query(10, ge=1, description="Low stock threshold"),
    db: Session = Depends(get_db)
):
    """Get stock items with low quantity"""
    low_stock = StockService.get_all_stock(db, limit=1000)  # Get all to filter
    alerts = [item for item in low_stock if item.quantity < threshold]
    
    return {
        "threshold": threshold,
        "alert_count": len(alerts),
        "items": [
            {
                "id": item.id,
                "reference": item.reference,
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price
            }
            for item in alerts
        ]
    }

@router.get("/performance/metrics")
async def get_performance_metrics(db: Session = Depends(get_db)):
    """Get key performance metrics"""
    from database import Stock, Finance, Movement
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    last_month = now - timedelta(days=30)
    
    # Total stock value
    total_stock_value = db.query(func.sum(Stock.total_value)).scalar() or 0.0
    
    # Monthly revenue
    monthly_revenue = db.query(func.sum(Finance.total_revenue)).filter(
        Finance.date >= last_month
    ).scalar() or 0.0
    
    # Monthly movements
    monthly_movements = db.query(func.count(Movement.id)).filter(
        Movement.date >= last_month
    ).scalar() or 0
    
    # Average discount
    avg_discount = db.query(func.avg(Finance.discount_percent)).scalar() or 0.0
    
    # Stock turnover (items sold this month / total stock)
    items_sold_month = db.query(func.sum(Finance.quantity_sold)).filter(
        Finance.date >= last_month
    ).scalar() or 0
    
    total_stock_quantity = db.query(func.sum(Stock.quantity)).scalar() or 1
    
    turnover_rate = (items_sold_month / total_stock_quantity) * 100 if total_stock_quantity > 0 else 0
    
    return {
        "total_stock_value": float(total_stock_value),
        "monthly_revenue": float(monthly_revenue),
        "monthly_movements": monthly_movements,
        "average_discount": float(avg_discount),
        "stock_turnover_rate": float(turnover_rate),
        "items_sold_this_month": items_sold_month
    }


