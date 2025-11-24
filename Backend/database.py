import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

CONNECTION_STRING = os.getenv('CONNECTION_STRING')
DATABASE_NAME = os.getenv('DATABASE_NAME')

def connect_to_db():
    """Connect to MongoDB and return database instance"""
    if not CONNECTION_STRING or not DATABASE_NAME:
        print("Error: CONNECTION_STRING or DATABASE_NAME not found in environment variables.")
        sys.exit(1)
    
    try:
        client = MongoClient(CONNECTION_STRING)
        db = client[DATABASE_NAME]
        # Test connection
        client.server_info()
        return db
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        sys.exit(1)

def get_database():
    """Dependency for getting database instance"""
    return connect_to_db()
