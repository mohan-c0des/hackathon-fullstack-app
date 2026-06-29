import os
import httpx
import asyncio
from typing import TypedDict, Annotated, List, Any
from dotenv import load_dotenv

from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

load_dotenv()

# ==========================================
# 1. GRAPH STATE
# ==========================================
class JourneyState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    phase: int
    profile: dict

# ==========================================
# 2. REAL APIs (With Hackathon Safety Fallbacks)
# ==========================================
async def api_sherpa_visa(citizenship: str, destination: str) -> str:
    """Sherpa v2 Travel Restrictions & Visa API"""
    api_key = os.getenv("SHERPA_API_KEY")
    if not api_key: return f"[SIMULATED SHERPA API] E-Visa required for {citizenship} to {destination}. Cost: $45. Valid for 90 days."
    try:
        url = f"https://api.sherespa.com/v2/entry-requirements?citizenship={citizenship}&destination={destination}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=5.0)
            return str(resp.json())
    except:
        return "[API ERROR] Visa requirements currently open. Standard passport validity of 6 months applies."

async def api_tugo_advisory(destination: str) -> str:
    """TuGo Travel Advisory API"""
    api_key = os.getenv("TUGO_API_KEY")
    if not api_key: return f"[SIMULATED TUGO API] Advisory Level 1 for {destination}: Exercise normal precautions. Health care is standard."
    try:
        url = f"https://api.tugo.com/v1/travel-advisories/{destination}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=5.0)
            return str(resp.json())
    except:
        return "[API ERROR] General safety precautions advised."

async def api_country_state_city(country: str, city: str) -> str:
    """Country State City mapping API"""
    api_key = os.getenv("CSC_API_KEY")
    if not api_key: return f"[SIMULATED CSC API] {city} is a major hub in {country}. Heavy transit infrastructure present."
    try:
        url = f"https://api.countrystatecity.in/v1/countries/{country}/cities"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"X-CSCAPI-KEY": api_key}, timeout=5.0)
            return str(resp.json()[:3]) # Truncate to save tokens
    except:
        return "[API ERROR] City geography mapping bypassed."

async def api_liveby_local(city: str) -> str:
    """LiveBy Local Data API"""
    api_key = os.getenv("LIVEBY_API_KEY")
    if not api_key: return f"[SIMULATED LIVEBY API] Median rent in {city} is standard for expats. Public transit score: 85/100. High speed internet widely available."
    try:
        url = f"https://api.liveby.com/v1/locations/neighborhoods?city={city}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=5.0)
            return str(resp.json())
    except:
        return "[API ERROR] Local community data bypassed."

# ==========================================
# 3. PHASE-SPECIFIC TOOLS
# ==========================================
@tool
async def pre_travel_tool(citizenship: str, target_country: str, target_city: str) -> str:
    """USE ONLY IN PHASE 1. Gathers mandatory documents, visas, and safety warnings."""
    sherpa, tugo, csc = await asyncio.gather(
        api_sherpa_visa(citizenship, target_country),
        api_tugo_advisory(target_country),
        api_country_state_city(target_country, target_city)
    )
    return f"SHERPA DATA:\n{sherpa}\n\nTUGO SAFETY DATA:\n{tugo}\n\nGEOGRAPHY DATA:\n{csc}"

@tool
async def while_travelling_tool(origin_city: str, target_country: str, step: str) -> str:
    """USE ONLY IN PHASE 2. Generates real-time transit guides (Airport navigation, customs, local emergency numbers)."""
    tugo, csc = await asyncio.gather(
        api_tugo_advisory(target_country),
        api_country_state_city(target_country, origin_city)
    )
    return f"CURRENT STEP: {step}\nSAFETY DATA:\n{tugo}\n\nTRANSIT DATA:\n{csc}"

@tool
async def post_travel_tool(target_city: str) -> str:
    """USE ONLY IN PHASE 3. Retrieves hyper-local cost of living, housing, and settling data."""
    liveby = await api_liveby_local(target_city)
    return f"LIVEBY NEIGHBORHOOD DATA:\n{liveby}"

# ==========================================
# 4. ORCHESTRATION & PERSONA
# ==========================================
tools = [pre_travel_tool, while_travelling_tool, post_travel_tool]
tool_node = ToolNode(tools=tools)

# Claude 3.5 Sonnet is arguably the best state-driven agent in the world right now
llm = ChatAnthropic(model_name="claude-3-5-sonnet-20240620", temperature=0.4, timeout=30, stop=None).bind_tools(tools)

async def call_model(state: JourneyState):
    phase = state["phase"]
    profile = state["profile"]
    
    SYSTEM_PROMPT = f"""You are 'Boomer', an incredibly friendly, capable, and highly organized personal Travel Concierge.
You are actively guiding the user through a journey to {profile.get('destination_city', 'their destination')} in {profile.get('target_country', 'their target country')}.

User Profile:
- Origin: {profile.get('origin_city')}
- Citizenship: {profile.get('citizenship')}
- Age: {profile.get('age')}
- Purpose: {profile.get('purpose')}

CURRENT PHASE: {phase}
Phase 1 = Pre-Travel (Visas, Packing, Planning)
Phase 2 = Transit (Airport, Flying, Customs)
Phase 3 = Post-Travel (Arriving at hotel/university, Cost of Living, Settling in)

DIRECTIVES:
1. You MUST use the exact tool for the current Phase. Do not skip ahead.
2. If the user just clicked a button (like 'Ready for next phase' or 'I arrived at the airport'), acknowledge it enthusiastically, run your tool, and give them the next checklist.
3. Be conversational! Talk like a highly capable friend. Use emojis.
4. Format your advice using Markdown (bolding, bullet points).
5. ALWAYS end your message by asking if they have doubts, OR telling them to click the action button to proceed.
"""

    messages_with_system = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = await llm.ainvoke(messages_with_system)
    return {"messages": [response]}

workflow = StateGraph(JourneyState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

boomer_agent = workflow.compile()