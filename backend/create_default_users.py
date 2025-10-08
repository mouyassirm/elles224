"""
Script to create default users for the application
"""
from sqlalchemy.orm import Session
from database import SessionLocal, User, Base, engine
import hashlib
import sys

def simple_hash_password(password: str) -> str:
    """Simple password hashing for development"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_default_users():
    """Create default users"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if users already exist
        existing_users = db.query(User).all()
        if existing_users:
            print("Users already exist in the database:")
            for user in existing_users:
                print(f"- {user.username} ({user.role})")
            return
        
        # Create CEO user
        ceo_user = User(
            username="Irfane",
            email="irfane@company.com",
            hashed_password=simple_hash_password("Irfane2025"),
            role="ceo",
            is_active=True
        )
        
        # Create Manager user
        manager_user = User(
            username="Haffoussath",
            email="haffoussath@company.com", 
            hashed_password=simple_hash_password("Haffoussath2025"),
            role="manager",
            is_active=True
        )
        
        # Add users to database
        db.add(ceo_user)
        db.add(manager_user)
        db.commit()
        
        print("Default users created successfully:")
        print("- CEO: Irfane (password: Irfane2025)")
        print("- Manager: Haffoussath (password: Haffoussath2025)")
        
    except Exception as e:
        print(f"Error creating users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_users()
