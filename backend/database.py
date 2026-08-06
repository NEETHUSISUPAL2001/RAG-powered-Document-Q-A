from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# We will read the MongoDB connection string from environment variables.
# Default to a local database if none is provided.
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "rag_db"

client = None
db = None

async def connect_to_mongo():
    """
    Connects to the MongoDB instance and initializes the db variable.
    This will be called when the FastAPI application starts up.
    """
    global client, db
    # Motor provides an asynchronous driver to communicate with MongoDB.
    # This ensures our API doesn't block while waiting for database queries.
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    print(f"Connected to MongoDB: {DB_NAME}")

async def close_mongo_connection():
    """
    Closes the connection to MongoDB.
    This will be called when the FastAPI application shuts down.
    """
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    """
    Dependency to get the database instance for our API routes.
    """
    return db
