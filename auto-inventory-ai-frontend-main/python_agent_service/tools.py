import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

# MONGO_URI = os.getenv("MONGO_URI") # Ideally from env
# Hardcoding for now to match Node.js server config shared by user
MONGO_URI = 'mongodb+srv://g6370173996_db_user:izOPAMR2KJFkUGeM@cluster0.czhyjjl.mongodb.net/hanuman_traders?appName=Cluster0'

client = AsyncIOMotorClient(MONGO_URI)
db = client.hanuman_traders

async def get_suppliers(category: str = None):
    """
    Fetches suppliers, optionally filtered by category.
    """
    query = {}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    
    cursor = db.suppliers.find(query)
    suppliers = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        suppliers.append(doc)
    return suppliers

async def get_product_details(product_name: str):
    """
    Fetches details for a specific product by name.
    """
    product = await db.products.find_one({"name": {"$regex": product_name, "$options": "i"}})
    if product:
        product["_id"] = str(product["_id"])
        # Calculate total stock
        total_stock = sum(product.get("stock", {}).values())
        product["total_stock"] = total_stock
        return product
    return None

async def check_inventory_levels():
    """
    Returns a summary of low stock items.
    """
    cursor = db.products.find({})
    low_stock = []
    async for p in cursor:
        stock = sum(p.get("stock", {}).values())
        if stock <= p.get("minStockLevel", 10):
            low_stock.append({"name": p["name"], "stock": stock, "min": p.get("minStockLevel", 10)})
    return low_stock

# Mock Email Service
async def send_email(supplier_id: str, subject: str, body: str):
    """
    Simulates sending an email to a supplier.
    """
    print(f"--- MOCK EMAIL SENT ---")
    print(f"To Supplier ID: {supplier_id}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("-----------------------")
    return {"status": "success", "message": f"Email sent to supplier {supplier_id}"}
