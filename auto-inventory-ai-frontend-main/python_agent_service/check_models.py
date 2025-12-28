import os
from google import genai
from dotenv import load_dotenv

# Hardcoding the key from frontend .env to eliminate env loading issues
# (Will replace with the specific key found in the next step if different, 
# but using the one I recall seeing earlier as a fallback placeholder for this script)
API_KEY = "AIzaSyBy8zXEHLqpKWY1MfOPok7OtvgOqZ3ybvc" 

client = genai.Client(api_key=API_KEY)

print(f"Checking models for key: {API_KEY[:5]}...")

try:
    # Try the v1beta/new SDK listing method
    for m in client.models.list():
        print(f" - {m.name}")
        if 'generateContent' in m.supported_generation_methods:
            print(f"   (Supports generateContent)")
except Exception as e:
    print(f"Error listing (method 1): {e}")

try:
    # Legacy method check just in case
    import google.generativeai as old_genai
    old_genai.configure(api_key=API_KEY)
    for m in old_genai.list_models():
        print(f" [Legacy] {m.name}")
except ImportError:
    pass
except Exception as e:
    print(f"Error listing (legacy): {e}")
