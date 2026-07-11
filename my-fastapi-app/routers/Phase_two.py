import json
import pycountry
from fastapi import APIRouter, HTTPException, Depends
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

# Schemas
from app.schemas import JourneyData, JourneyQuestion, JourneySaveRequest
# AI Agents
from app.LangGraphAgents.JourneyAgent import boomer_agent
from app.database import graph_db
from app.security import get_current_user

router = APIRouter()

# Helper to map full country names to ISO2 for the Visa API
def get_iso2(country_name: str) -> str:
    """Robustly convert a country name to its ISO Alpha-2 code."""
    try:
        # Try exact match first (e.g., "Japan" -> "JP")
        return pycountry.countries.lookup(country_name).alpha_2
    except LookupError:
        # Fallback fuzzy match (e.g., handles "UAE", "UK")
        try:
            return pycountry.countries.search_fuzzy(country_name)[0].alpha_2
        except LookupError:
            return "US" # Ultimate fallback

@router.post("/api/journey/interact", response_model=dict)
async def journey_interaction(schema: JourneyData):
    
    nat_iso = get_iso2(schema.nationality)
    tgt_iso = get_iso2(schema.target_country)

    prompt = f"""
    The user has provided the following details:
    - Name: {schema.name}
    - Age: {schema.age} | Gender: {schema.gender} | Role: {schema.role}
    - Origin: {schema.origin_city}, {schema.country}
    - Destination: {schema.exact_destination}, {schema.target_country}
    - Nationality: {schema.nationality} (ISO: {nat_iso}) | Target ISO: {tgt_iso}
    - Health Condition: {schema.health_condition}
    - Passport Expiry: {schema.passport_expiry} | Blank Pages: {schema.passport_blank_pages}
    - Purpose: {schema.purpose} | Duration: {schema.travel_duration}
    - Add-ons: {schema.add_ons} | Extra Info: {schema.extra_info}

    Please guide the user. Fetch the required API contexts, and then call `structure_complete_journey_plan`.
    If anything in the user provided details are in incorrect or does not exist - for example destination_city: gruhnb - terminate all the steps and inform user 
    that it does not exist. (remember: im not talking about spelling mistakes.)
    """
    
    # We pass a thread_id so the agent remembers this specific user's plan!
    config = RunnableConfig(configurable={"thread_id": schema.session_id})
    
    # Execute the LangGraph workflow
    result = await boomer_agent.ainvoke({"messages": [HumanMessage(content=prompt)]}, config)
    
    # ... existing code (right after result = await boomer_agent.ainvoke...) ...
    messages = result.get("messages", [])
    
    structured_data = None
    
    for msg in reversed(messages):
        # Method 1: Standard LangChain tool_calls attribute
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tool_call in msg.tool_calls:
                if tool_call["name"] == "structure_complete_journey_plan":
                    structured_data = tool_call["args"]
                    break
        
        # Method 2: Fallback for models (like Gemini) that nest it in additional_kwargs
        elif hasattr(msg, "additional_kwargs") and "tool_calls" in msg.additional_kwargs:
            for tool_call in msg.additional_kwargs["tool_calls"]:
                if tool_call.get("function", {}).get("name") == "structure_complete_journey_plan":
                    import json
                    structured_data = json.loads(tool_call["function"]["arguments"])
                    break
                    
        if structured_data:
            break
            
    if not structured_data:
        # If it fails, print the AI's last message to the terminal so we can debug!
        print("\n--- AI FAILED TO USE TOOL. HERE IS WHAT IT SAID INSTEAD ---")
        if messages:
            print(messages[-1].content)
        print("-----------------------------------------------------------\n")
        
        raise HTTPException(status_code=500, detail="Boomer failed to structure the journey plan properly.")

    # Extract the dictionaries the LLM generated...
    # ... rest of your code ...

    # ... inside phase_two.py, right after intercepting structured_data ...

    # Extract the Lists of Dictionaries
    pre_list = structured_data.get("pre_travel_output", [])
    transit_list = structured_data.get("transit_output", [])
    post_list = structured_data.get("post_travel_output", [])

    # Helper function to flatten the List[Dict] into ordered arrays
    def extract_ordered_data(phase_list):
        keys = []
        values = []
        for step_dict in phase_list:
            for k, v in step_dict.items():
                keys.append(k)
                values.append(v)
        return keys, values

    pre_keys, pre_values = extract_ordered_data(pre_list)
    transit_keys, transit_values = extract_ordered_data(transit_list)
    post_keys, post_values = extract_ordered_data(post_list)

    # Format exactly as your frontend array handler expects!
    return {
        "output": [pre_list, transit_list, post_list],
        "step_names": {
            "pre_travel_steps": pre_keys,
            "transit_steps": transit_keys,
            "post_travel_steps": post_keys,
        },
        "step_data": {
            "pre_travel_step_data": pre_values,
            "transit_step_data": transit_values,
            "post_travel_step_data": post_values,
        },
        "counts": {
            "pre_no": len(pre_keys),
            "transit_no": len(transit_keys),
            "post_no": len(post_keys),
        }
    }

@router.post("/api/journey/question", response_model=dict)
async def question(schema: JourneyQuestion):
    """Answers user questions using LangGraph Memory and Dynamic API Fetching."""
    prompt = f"User Question: {schema.question}\nUser is currently looking at step: {schema.current_step}\nExecute clarify_doubts tool to fetch real-time data if needed, answer the question, and ask if they are ready to proceed."

    # Pass the SAME thread_id so the AI remembers the plan it just generated!
    config = RunnableConfig(configurable={"thread_id": schema.session_id})
    
    result = await boomer_agent.ainvoke({"messages": [HumanMessage(content=prompt)]}, config)
    
    # Get the final conversational response
    final_message = result["messages"][-1].content
    
    return {"answer": final_message}

@router.post("/api/journey/save")
async def save_journey(schema: JourneySaveRequest, user_id: str = Depends(get_current_user)):
    try:
        await graph_db.save_user_journey(user_id, schema.target_country, schema.journey_plan)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEW: Fetch Archived Journeys Endpoint
@router.get("/api/journey/history")
async def get_journey_history(user_id: str = Depends(get_current_user)):
    try:
        journeys = await graph_db.get_user_journeys(user_id)
        return {"data": journeys}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))