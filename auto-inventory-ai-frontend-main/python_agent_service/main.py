from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents import omni_agent
import uvicorn
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    text: str
    user_id: str
    context: dict = {}

@app.post("/agent/chat")
async def chat_endpoint(request: QueryRequest):
    """
    Main entry point. Pipes everything to the Omni-Agent.
    """
    print(f"User Query: {request.text}")
    
    try:
        # Execute ADK Agent
        response_text = omni_agent.chat(request.text)
        
        # Check if the response contains a JSON action (like Navigation)
        # The agent might return a string representation of the tool result or just text.
        # If the agent decided to "navigate", the tool returned a Dict.
        # With current ADK implementation, `chat` returns the final text part. 
        # But `navigate_ui` tool execution happens internally. 
        # To support UI Action feedback, we need to capture the tool outputs in `adk.py`.
        # OR, we instruct the Agent to output a specific JSON Code Block for actions.
        
        # Simple parsing for now:
        nav_action = None
        if "NAVIGATE" in response_text:
           # Attempt to extract if it passed through text (The tool might print it)
           pass
           
        return {
            "response": {
                "text": response_text,
                # In a robust ADK, we'd return a list of 'events' including tool_use.
                # For this MVP, text is sufficient as the 'navigate_ui' tool 
                # strictly prints to console in this version unless we modify ADK to return artifacts.
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "response": {
                "text": f"Error interacting with Agent: {str(e)}"
            }
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
