import inspect
from typing import List, Callable, Any
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

class Tool:
    def __init__(self, func: Callable):
        self.func = func
        self.name = func.__name__
        self.description = func.__doc__ or "No description provided."
        
    def to_genai_tool(self):
        # In a real ADK, this would use inspection to generate Schema
        # For simplicity with 'google-genai', we pass the function directly 
        # as the SDK supports direct function binding now.
        return self.func

class LlmAgent:
    def __init__(self, name: str, model: str, description: str, instruction: str, tools: List[Tool]):
        self.name = name
        self.model_name = model
        self.description = description
        self.instruction = instruction
        self.tools = tools
        self.tool_map = {t.name: t.func for t in tools}
        
        # Initialize Client
        api_key = os.getenv("GEMINI_API_KEY") 
        vertex_project = os.getenv("VERTEX_PROJECT_ID")
        vertex_location = os.getenv("VERTEX_LOCATION", "us-central1")

        if vertex_project:
            # Vertex AI Initialization
            self.client = genai.Client(
                vertexai=True, 
                project=vertex_project, 
                location=vertex_location
            )
        else:
            if not api_key:
                 # Fallback for dev environment if env not set
                 api_key = "AIzaSyBy8zXEHLqpKWY1MfOPok7OtvgOqZ3ybvc"
                 
            self.client = genai.Client(api_key=api_key)
        self.chat_session = None

    def _get_tools_config(self):
        # Return list of callables
        return [t.func for t in self.tools]

    def chat(self, user_input: str, history: List[Any] = None):
        """
        Executes the agent loop:
        1. Sends User Input -> Model
        2. Model decides -> Tool Call OR Text
        3. If Tool Call -> Execute -> Send Result -> Model
        4. Repeat until Text Response
        """
        
        context_prompt = f"""
        System Instruction: {self.instruction}
        
        Role: {self.name}
        Description: {self.description}
        """
        
        raw_tools = self._get_tools_config()
        
        # 1. First Call using explicit Part constructor
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Content(role="user", parts=[types.Part(text=context_prompt + f"\n\nUser: {user_input}")])
            ],
            config=types.GenerateContentConfig(tools=raw_tools)
        )
        
        # Loop for Tool Execution
        max_turns = 5
        current_response = response
        
        for _ in range(max_turns):
            if not current_response.candidates:
                return "Error: No response from model."
                
            part = current_response.candidates[0].content.parts[0]
            
            # Check for Function Call
            if part.function_call:
                fc = part.function_call
                fn_name = fc.name
                fn_args = fc.args
                
                print(f"[{self.name}] Calling Tool: {fn_name} with {fn_args}")
                
                if fn_name in self.tool_map:
                    try:
                        # Execute Tool
                        result = self.tool_map[fn_name](**fn_args)
                        
                        # Feed back to model
                        current_response = self.client.models.generate_content(
                            model=self.model_name,
                            contents=[
                                types.Content(role="user", parts=[types.Part(text=context_prompt + f"\n\nUser: {user_input}")]),
                                types.Content(role="model", parts=[part]), # The function call
                                types.Content(role="user", parts=[types.Part.from_function_response(name=fn_name, response={"result": result})])
                            ],
                            config=types.GenerateContentConfig(tools=raw_tools)
                        )
                    except Exception as e:
                        return f"Tool Error ({fn_name}): {str(e)}"
                else:
                    return f"Error: Tool {fn_name} not found."
            else:
                # Text Response - We are done
                return part.text

        return "Agent stopped (max turns reached)."
