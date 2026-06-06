from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio # Just for simulating a delay

app = FastAPI()

# Your CORS setup (keep what you already have)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Define the shape of the data React will send
class CountryRequest(BaseModel):
    country: str

# 2. Create the POST endpoint
@app.post("/api/briefing")
async def generate_country_briefing(request: CountryRequest):
    selected_country = request.country
    
    # --- YOUR LANGGRAPH CODE WILL GO HERE ---
    # Example: 
    # briefing_text = langgraph_agent.invoke({"country": selected_country})
    
    # For now, we simulate the LLM taking 3 seconds to think:
    await asyncio.sleep(3) 
    mock_briefing = f"Here is the AI briefing for {selected_country}. The economy is stable, the currency is trading well, and the culture is rich with history."
    # ----------------------------------------

    # 3. Return the data to React
    return {"status": "success", "briefing": mock_briefing}