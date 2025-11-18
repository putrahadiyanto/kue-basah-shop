import pymongo as mongo
from dotenv import load_dotenv
import os

def connect_to_db():

    print("Loading environment variables from .env file")
    load_dotenv()
    CONNECTION_STRING = os.getenv('CONNECTION_STRING')
    DATABASE_NAME = os.getenv('DATABASE_NAME')

    if not CONNECTION_STRING or not DATABASE_NAME:
        print("Error: CONNECTION_STRING or DATABASE_NAME not found in environment variables.")
        exit(1)
    else :
        print("Environment variables loaded successfully.")

    client = mongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    print("Connected to MongoDB.")

    return db