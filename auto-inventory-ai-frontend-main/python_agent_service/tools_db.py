import os
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict
import asyncio

# Setup DB
MONGO_URI = 'mongodb+srv://g6370173996_db_user:izOPAMR2KJFkUGeM@cluster0.czhyjjl.mongodb.net/hanuman_traders?appName=Cluster0'
client = AsyncIOMotorClient(MONGO_URI)
db = client.hanuman_traders

# --- Helpers ---
# We need synchronous wrappers or handle async in ADK. 
# For simplicity in this `adk.py` implementation which uses `generate_content` (sync-like in simple usage),
# we might need to run these in an event loop or use the async version of the SDK.
# HOWEVER, `google-genai` is async native but our ADK wrapper `chat` was sync.
# Let's make the tools SYNC for now by using `pymongo` for the agent to avoid event loop complexity 
# inside the simple ADK loop, OR we update `adk.py` to be async.
# Updating `adk.py` to be `async def chat` is better for FastAPI.

# Switching to PyMongo (blocking) for the tools to ensure compatibility with standard python functions
from pymongo import MongoClient
sync_client = MongoClient(MONGO_URI)
sync_db = sync_client.hanuman_traders

def fetch_suppliers_by_item(item_name: str) -> List[Dict]:
    """
    Queries the database for suppliers providing a specific item or category.
    Useful for 'Phase 1: Identification'.
    """
    # Regex search on 'category' or 'products'
    # Assuming suppliers have a 'category' field roughly matching items
    suppliers = list(sync_db.suppliers.find({"category": {"$regex": item_name, "$options": "i"}}))
    if not suppliers:
        # Fallback: Return all and let agent filter? No, return empty.
        return []
    
    # Sanitize ObjectId
    results = []
    for s in suppliers:
        results.append({
            "id": str(s["_id"]),
            "name": s.get("name"),
            "contact_person": s.get("contact_person"),
            "email": s.get("email"),
            "category": s.get("category")
        })
    return results

def get_inventory_status(product_name: str = None) -> List[Dict]:
    """
    Checks stock levels. If product_name is provided, searches for it.
    Otherwise returns low stock items.
    """
    query = {}
    if product_name:
        query["name"] = {"$regex": product_name, "$options": "i"}
    
    products = list(sync_db.products.find(query))
    results = []
    for p in products:
        stock = sum(p.get("stock", {}).values())
        results.append({
            "name": p["name"],
            "sku": p.get("sku"),
            "total_stock": stock,
            "min_level": p.get("minStockLevel"),
            "price": p.get("price")
        })
    return results

def send_order_email(recipient_email: str, email_body: str):
    """
    Triggers the actual email sending.
    Use this ONLY in 'Phase 4: Execution'.
    """
    print(f"\n--- 📧 EMAIL SENT TO: {recipient_email} ---\n{email_body}\n----------------------------")
    # In real app, call SMTP here
    return f"Success: Email dispatched to {recipient_email}."

def navigate_ui(route_path: str):
    """
    Navigates the user's screen to a specific page.
    Valid paths: '/inventory', '/sales', '/suppliers', '/customers', '/analytics', '/settings'.
    """
    print(f"--- NAVIGATING TO: {route_path} ---")
    return {"action": "NAVIGATE", "payload": route_path}

def get_recent_sales():
    """Returns the last 5 sales transactions."""
    sales = list(sync_db.sales.find().sort("date", -1).limit(5))
    results = []
    for s in sales:
        results.append({
            "date": s["date"],
            "amount": s.get("totalAmount"),
            "items_count": len(s.get("items", []))
        })
    return results

from datetime import datetime, timedelta

# --- Helper Logic ---
def get_daily_sales_velocity(product_id: str, days: int = 30) -> float:
    """Calculates average daily sales over X days using Aggregation."""
    cutoff = datetime.now() - timedelta(days=days)
    # Note: 'date' in sales might be string or datetime. Assuming ISO string or date obj.
    # In this specific DB, dates are likely strings, so simple comparison might need care.
    # For robustnes, we'll try to match all and filter in python if aggregations fail on types,
    # but let's try standard pymongo aggregation first.
    
    # Check if 'date' is string or datetime in DB. 
    # Current codebase uses strings in many places. 
    # If string, we might need $toDate (Mongo 4.0+) or just simplified logic.
    
    # Simplified Logic (Python-side filtering) to be safe across Mongo versions/types:
    sales = list(sync_db.sales.find({}))
    total_qty = 0
    for s in sales:
        sale_date = s.get("date")
        # Parse date if string
        if isinstance(sale_date, str):
            try:
                sale_date = datetime.fromisoformat(sale_date.replace("Z", "+00:00"))
            except ValueError:
                continue # Skip invalid dates
        
        if sale_date and sale_date >= cutoff:
            for item in s.get("items", []):
                if str(item.get("productId")) == product_id:
                    total_qty += item.get("quantity", 0)
                    
    return total_qty / days

def analyze_restock_needs(product_name: str = None) -> List[Dict]:
    """
    Scenario A Support: Fetches stock, sales velocity, and supplier options.
    """
    query = {}
    if product_name:
        query["name"] = {"$regex": product_name, "$options": "i"}
        
    products = list(sync_db.products.find(query))
    results = []
    
    for product in products:
        pid = str(product["_id"])
        
        # 1. Get Stock
        current_stock = sum(product.get("stock", {}).values())
        
        # 2. Get Velocity (Sales/Day)
        daily_velocity = get_daily_sales_velocity(pid)
        
        # 3. Calculate Days Remaining
        days_left = current_stock / daily_velocity if daily_velocity > 0 else 999
        
        # 4. Get Suppliers (Simplified for list view)
        # suppliers = list(sync_db.suppliers.find({"products_supplied": pid}, {"_id": 0})) 
        # (Assuming suppliers linkage exists, otherwise generic fetch)
        
        # Threshold logic from User Requirement: (Velocity * 5) + MinStock
        min_stock = product.get('minStockLevel', 10)
        restock_threshold = (daily_velocity * 5) + min_stock
        
        if days_left < 10 or product_name:
            results.append({
                "product": product['name'],
                "current_stock": current_stock,
                "daily_sales": round(daily_velocity, 2),
                "days_until_stockout": round(days_left, 1),
                "restock_threshold": round(restock_threshold, 1),
                "status": "CRITICAL" if days_left < 5 else "WARNING"
            })

    return sorted(results, key=lambda x: x["days_until_stockout"])

def get_profit_analysis() -> List[Dict]:
    """
    Scenario B Support: Scans catalog for Margin vs. Velocity opportunities.
    """
    products = list(sync_db.products.find({}))
    analysis = []

    for p in products:
        pid = str(p["_id"])
        price = p.get('price', 0)
        cost = p.get('cost', price * 0.7) # Fallback
        
        if price > 0:
            margin_percent = ((price - cost) / price) * 100
            velocity = get_daily_sales_velocity(pid)
            
            # The "Profit Rule" Metric: (Price - Cost) * Velocity
            profit_score = (price - cost) * velocity
            
            analysis.append({
                "name": p['name'],
                "margin_percent": round(margin_percent, 1),
                "velocity": round(velocity, 2),
                "profit_potential_score": round(profit_score, 2),
                "recommendation": "Promote" if margin_percent > 20 else "Clearance"
            })
    
    # Sort by highest profit potential
    return sorted(analysis, key=lambda x: x['profit_potential_score'], reverse=True)[:5]

def identify_dead_stock() -> List[Dict]:
    """
    Finds items with ZERO sales in the last 30 days.
    """
    # 1. Get IDs of sold items
    sales = list(sync_db.sales.find({})) 
    sold_product_ids = set()
    for s in sales:
        for item in s.get("items", []):
            sold_product_ids.add(str(item.get("productId")))
            
    # 2. Find products NOT in that set
    products = list(sync_db.products.find({}))
    dead_stock = []
    for p in products:
        if str(p["_id"]) not in sold_product_ids:
             dead_stock.append({
                 "product": p["name"],
                 "stock_locked": sum(p.get("stock", {}).values()),
                 "value_locked": sum(p.get("stock", {}).values()) * p.get("price", 0)
             })
             
    return dead_stock[:10]
