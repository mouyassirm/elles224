"""
Business logic services for Stock Management System
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from database import Stock, Movement, Finance
from schemas import StockCreate, StockUpdate, MovementCreate, FinanceCreate

class StockService:
    """Service for stock management"""
    
    @staticmethod
    def create_stock(db: Session, stock_data: StockCreate) -> Stock:
        """Create a new stock item"""
        # Calculate total value
        total_value = stock_data.quantity * stock_data.unit_price
        
        db_stock = Stock(
            reference=stock_data.reference,
            name=stock_data.name,
            quantity=stock_data.quantity,
            unit_price=stock_data.unit_price,
            total_value=total_value
        )
        db.add(db_stock)
        db.commit()
        db.refresh(db_stock)
        return db_stock
    
    @staticmethod
    def get_stock(db: Session, stock_id: int) -> Optional[Stock]:
        """Get stock by ID"""
        return db.query(Stock).filter(Stock.id == stock_id).first()
    
    @staticmethod
    def get_stock_by_reference(db: Session, reference: str) -> Optional[Stock]:
        """Get stock by reference"""
        return db.query(Stock).filter(Stock.reference == reference).first()
    
    @staticmethod
    def get_all_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Stock]:
        """Get all stock items with pagination"""
        return db.query(Stock).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_stock(db: Session, stock_id: int, stock_data: StockUpdate) -> Optional[Stock]:
        """Update stock item"""
        db_stock = db.query(Stock).filter(Stock.id == stock_id).first()
        if not db_stock:
            return None
        
        # Update fields
        if stock_data.name is not None:
            db_stock.name = stock_data.name
        if stock_data.unit_price is not None:
            db_stock.unit_price = stock_data.unit_price
        if stock_data.quantity is not None:
            db_stock.quantity = stock_data.quantity
        
        # Recalculate total value
        db_stock.total_value = db_stock.quantity * db_stock.unit_price
        db_stock.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_stock)
        return db_stock
    
    @staticmethod
    def delete_stock(db: Session, stock_id: int) -> bool:
        """Delete stock item"""
        db_stock = db.query(Stock).filter(Stock.id == stock_id).first()
        if not db_stock:
            return False
        
        db.delete(db_stock)
        db.commit()
        return True
    
    @staticmethod
    def update_stock_quantity(db: Session, stock_id: int, quantity_change: int):
        """Update stock quantity (used by movements)"""
        db_stock = db.query(Stock).filter(Stock.id == stock_id).first()
        if db_stock:
            db_stock.quantity += quantity_change
            db_stock.total_value = db_stock.quantity * db_stock.unit_price
            db_stock.updated_at = datetime.utcnow()
            db.commit()

class MovementService:
    """Service for movement management"""
    
    @staticmethod
    def create_movement(db: Session, movement_data: MovementCreate) -> Movement:
        """Create a new movement"""
        # Validate stock exists
        stock = StockService.get_stock(db, movement_data.stock_id)
        if not stock:
            raise ValueError("Stock not found")
        
        # Create movement
        db_movement = Movement(
            stock_id=movement_data.stock_id,
            movement_type=movement_data.movement_type,
            quantity=movement_data.quantity,
            discount_percent=movement_data.discount_percent or 0.0,
            date=movement_data.date or datetime.utcnow()
        )
        db.add(db_movement)
        db.commit()
        db.refresh(db_movement)
        
        # Update stock quantity
        quantity_change = movement_data.quantity if movement_data.movement_type == "purchase" else -movement_data.quantity
        StockService.update_stock_quantity(db, movement_data.stock_id, quantity_change)
        
        # If it's a sale, create finance record
        if movement_data.movement_type == "sale":
            MovementService._create_finance_record(db, movement_data, stock)
        
        return db_movement
    
    @staticmethod
    def _create_finance_record(db: Session, movement_data: MovementCreate, stock: Stock):
        """Create finance record for a sale"""
        price_after_discount = stock.unit_price * (1 - (movement_data.discount_percent or 0.0) / 100)
        total_revenue = price_after_discount * movement_data.quantity
        
        finance_record = Finance(
            stock_id=movement_data.stock_id,
            quantity_sold=movement_data.quantity,
            unit_price=stock.unit_price,
            discount_percent=movement_data.discount_percent or 0.0,
            price_after_discount=price_after_discount,
            total_revenue=total_revenue,
            date=movement_data.date or datetime.utcnow()
        )
        db.add(finance_record)
        db.commit()
    
    @staticmethod
    def get_movements(db: Session, skip: int = 0, limit: int = 100) -> List[Movement]:
        """Get all movements with pagination"""
        return db.query(Movement).order_by(desc(Movement.date)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_movements_by_stock(db: Session, stock_id: int) -> List[Movement]:
        """Get movements for a specific stock"""
        return db.query(Movement).filter(Movement.stock_id == stock_id).order_by(desc(Movement.date)).all()

class FinanceService:
    """Service for financial management"""
    
    @staticmethod
    def get_all_sales(db: Session, skip: int = 0, limit: int = 100) -> List[Finance]:
        """Get all sales with pagination"""
        return db.query(Finance).order_by(desc(Finance.date)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_sales_by_date_range(db: Session, start_date: datetime, end_date: datetime) -> List[Finance]:
        """Get sales within a date range"""
        return db.query(Finance).filter(
            Finance.date >= start_date,
            Finance.date <= end_date
        ).order_by(desc(Finance.date)).all()
    
    @staticmethod
    def get_total_revenue(db: Session) -> float:
        """Get total revenue"""
        result = db.query(func.sum(Finance.total_revenue)).scalar()
        return result or 0.0
    
    @staticmethod
    def get_average_discount(db: Session) -> float:
        """Get average discount percentage"""
        result = db.query(func.avg(Finance.discount_percent)).scalar()
        return result or 0.0

class ReportService:
    """Service for generating reports"""
    
    @staticmethod
    def get_stock_summary(db: Session) -> dict:
        """Get stock summary statistics"""
        total_items = db.query(func.count(Stock.id)).scalar() or 0
        total_value = db.query(func.sum(Stock.total_value)).scalar() or 0.0
        low_stock_items = db.query(func.count(Stock.id)).filter(Stock.quantity < 10).scalar() or 0
        
        return {
            "total_items": total_items,
            "total_value": total_value,
            "low_stock_items": low_stock_items
        }
    
    @staticmethod
    def get_financial_summary(db: Session) -> dict:
        """Get financial summary statistics"""
        total_revenue = FinanceService.get_total_revenue(db)
        total_sales = db.query(func.count(Finance.id)).scalar() or 0
        average_discount = FinanceService.get_average_discount(db)
        
        # Get best selling item
        best_seller = db.query(
            Finance.stock_id,
            func.sum(Finance.quantity_sold).label('total_sold')
        ).group_by(Finance.stock_id).order_by(desc('total_sold')).first()
        
        best_selling_item = None
        if best_seller:
            stock = StockService.get_stock(db, best_seller.stock_id)
            if stock:
                best_selling_item = stock.name
        
        return {
            "total_revenue": total_revenue,
            "total_sales": total_sales,
            "average_discount": average_discount,
            "best_selling_item": best_selling_item
        }
    
    @staticmethod
    def get_dashboard_data(db: Session) -> dict:
        """Get complete dashboard data"""
        stock_summary = ReportService.get_stock_summary(db)
        financial_summary = ReportService.get_financial_summary(db)
        
        # Get recent movements and sales
        recent_movements = MovementService.get_movements(db, limit=5)
        recent_sales = FinanceService.get_all_sales(db, limit=5)
        
        return {
            "stock_summary": stock_summary,
            "financial_summary": financial_summary,
            "recent_movements": recent_movements,
            "recent_sales": recent_sales
        }


