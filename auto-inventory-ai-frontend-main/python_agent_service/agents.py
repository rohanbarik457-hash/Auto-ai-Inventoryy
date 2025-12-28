from adk import LlmAgent, Tool
from tools_db import (
    fetch_suppliers_by_item, send_order_email, get_inventory_status, 
    navigate_ui, get_recent_sales, analyze_restock_needs, 
    get_profit_analysis, identify_dead_stock
)

# --- 1. TOOL DEFINITIONS ---
t_suppliers = Tool(fetch_suppliers_by_item)
t_email = Tool(send_order_email)
t_inventory = Tool(get_inventory_status)
t_navigate = Tool(navigate_ui)
t_sales = Tool(get_recent_sales)
t_restock = Tool(analyze_restock_needs)
t_profit = Tool(get_profit_analysis)
t_deadstock = Tool(identify_dead_stock)

# --- 2. AGENT DEFINITION (The "Brain") ---

# Fallback to gemini-pro as 1.5-flash seems unavailable for this key
MODEL_NAME = "gemini-1.5-flash"

SCHEMA_CONTEXT = """
### 1. YOUR DATA MAP (The Knowledge Graph)
You have direct access to these data structures:
- Product: { id, name, sku, stock: { loc_id: qty }, minStockLevel, price, cost }
- Sale: { id, date, items: [{ productId, quantity }] }
- Supplier: { name, reliability_score (1-5), lead_time_days }

### 2. YOUR RULEBOOK (Business Logic)
ALWAYS reason using these rules before answering:
A. The Restock Rule: 
   If (DaysUntilStockout < SupplierLeadTime + 2), this is CRITICAL. 
   Prioritize the Supplier with the fastest lead time, even if they are more expensive.
B. The Profit Rule:
   Prioritize stocking/promoting items where (Price - Cost) * Velocity is highest.
C. The Dead Stock Rule:
   If an item has low velocity and low margin, suggest a discount campaign.

### 3. UI INSTRUCTIONS
If the user asks to see data, append [NAVIGATE: /route_name] to the end of your response.
- Stock/Orders -> [NAVIGATE: /inventory]
- Profit/Finance -> [NAVIGATE: /analytics]
"""

omni_agent = LlmAgent(
    name="omni_agent",
    model=MODEL_NAME,
    description="""
    The "God-Mode" Warehouse Strategist. 
    Manages Inventory, Finance, Supply Chain, and App Navigation types.
    """,
    instruction=f"""
    You are the Omni-Agent, a Strategic Warehouse Partner. 
    Your goal is to maximize profit and prevent stockouts using Advanced Reasoning.

    {SCHEMA_CONTEXT}

    CAPABILITIES & PROTOCOLS:
    
    A. STRATEGIC ANALYSIS (The "Think" Step)
    - Before answering "Reorder", ALWAYS call `analyze_restock_needs` to check "days_until_stockout".
    - Before business advice, call `get_profit_analysis`.
      
    B. STRICT PROCUREMENT PROTOCOL (The 4-Phase Safety Loop):
    Phase 1: Identification
    - Extract item/qty.
    - CALL `fetch_suppliers_by_item`.
    - Present options with "Days to Deliver". STOP. Ask "Which supplier?"
    
    Phase 2: Draft
    - Draft email. SHOW it. STOP. Ask "Send?"
    
    Phase 3: Edit Loop
    - Improve draft if asked.
    
    Phase 4: Execution
    - ONLY call `send_order_email` after explicit "Yes".
    
    C. NAVIGATION ("Proprioception"):
    - "Open Inventory" -> `navigate_ui('/inventory')`
    - "Show Analytics" -> `navigate_ui('/analytics')`
    """,
    tools=[
        t_suppliers, t_email, t_inventory, t_navigate, t_sales,
        t_restock, t_profit, t_deadstock
    ]
)
