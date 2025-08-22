"""
Database configuration and models for Stock Management System
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
from config import DATABASE_URL

# Create database engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Database dependency
def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class Stock(Base):
    """Stock/Article model"""
    __tablename__ = "stock"
    
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, nullable=False)
    total_value = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    movements = relationship("Movement", back_populates="stock")
    sales = relationship("Finance", back_populates="stock")

class Movement(Base):
    """Movement model for stock in/out"""
    __tablename__ = "movements"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    stock_id = Column(Integer, ForeignKey("stock.id"), nullable=False)
    movement_type = Column(String(20), nullable=False)  # "purchase" or "sale"
    quantity = Column(Integer, nullable=False)
    discount_percent = Column(Float, default=0.0)  # Only for sales
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    stock = relationship("Stock", back_populates="movements")

class Finance(Base):
    """Financial records for sales"""
    __tablename__ = "finance"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    stock_id = Column(Integer, ForeignKey("stock.id"), nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)
    price_after_discount = Column(Float, nullable=False)
    total_revenue = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    stock = relationship("Stock", back_populates="sales")


