"""
Test script to verify authentication
"""
import requests
import json

def test_login():
    url = "http://127.0.0.1:8000/api/auth/login-json"
    
    # Test CEO login
    ceo_data = {
        "username": "Irfane",
        "password": "Irfane2025"
    }
    
    print("Testing CEO login...")
    try:
        response = requests.post(url, json=ceo_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Login successful! User: {data['user']['username']}, Role: {data['user']['role']}")
        else:
            print("Login failed!")
            
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test Manager login
    manager_data = {
        "username": "Haffoussath", 
        "password": "Haffoussath2025"
    }
    
    print("Testing Manager login...")
    try:
        response = requests.post(url, json=manager_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Login successful! User: {data['user']['username']}, Role: {data['user']['role']}")
        else:
            print("Login failed!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()




