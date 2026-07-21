import os
import re
import json
import httpx
import asyncio
from typing import TypedDict, Annotated, List, Any
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

load_dotenv()

# ==========================================
# 1. GRAPH STATE
# ==========================================
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

# ==========================================
# 2. BULLETPROOF ASYNC API FETCHERS
# ==========================================
def _slugify(text: str) -> str:
    """Converts 'United States' to 'united-states' for the Altoal API."""
    return re.sub(r'[\W_]+', '-', text.lower().strip())

async def fetch_altoal_data(client: httpx.AsyncClient, country: str) -> dict:
    """Fetches comprehensive structural data from Altoal API."""
    slug = _slugify(country)
    url = f"https://countries.altoal.com/api/v1/name/{slug}.json"
    print(f"[API] Altoal Request: {slug}")
    try:
        response = await client.get(url, timeout=12.0, follow_redirects=True)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"[API ERROR] Altoal failed for {country}: {e}")
    
    # Return empty dict on failure so fallback logic triggers smoothly
    return {"error": "Altoal data unavailable. Fallback to RestCountries or internal knowledge."}

async def _fetch_rest_countries(client: httpx.AsyncClient, country: str) -> dict:
    """Fetches country profile facts using the RestCountries V5 Enterprise endpoint."""
    clean_country = country.strip().lower()
    
    
    api_key = os.getenv("RESTCOUNTRIES_V5_KEY")
    if not api_key:
        print("[API ERROR] RESTCOUNTRIES_V5_KEY is missing from environment variables.")
        return _get_fallback_data(country)

    
    url = f"https://api.restcountries.com/countries/v5?q={clean_country}&limit=1"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    print(f"\n[API CALL] Fetching RestCountries V5 data for: {clean_country}...")
    try:
        
        response = await client.get(url, headers=headers, timeout=10.0, follow_redirects=True)
        print(f"[API RESPONSE] RestCountries V5 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            raw_data = response.json()
            country_data = raw_data[0] if isinstance(raw_data, list) and len(raw_data) > 0 else {}
            
            
            pop = country_data.get('population', 'Unknown')
            pop_str = f"{pop:,}" if isinstance(pop, int) else str(pop)
            
            return {
                "name": country_data.get("names", {}).get("common", country.capitalize()),
                "capital": country_data.get("capital", ["Unknown"])[0] if isinstance(country_data.get("capital"), list) else "Unknown",
                "region": country_data.get("region", "Unknown"),
                "population": pop_str, 
                "currencies": list(country_data.get("currencies", {}).keys()) if isinstance(country_data.get("currencies"), dict) else [],
                "languages": list(country_data.get("languages", {}).values()) if isinstance(country_data.get("languages"), dict) else []
            }
        else:
            print(f"[API ERROR] RestCountries V5 rejected request. Code: {response.status_code}, Body: {response.text}")
            
    except Exception as e:
        print(f"[API ERROR] RestCountries V5 pipeline failed: {str(e)}")
    
    return _get_fallback_data(country)

def _get_fallback_data(country: str) -> dict:
    """Failsafe backup so the LLM always has a baseline to work with."""
    print("[FALLBACK] Deploying structural baseline data profile.")
    return {
        "name": country.title(),
        "capital": "Metropolitan Capital Hub",
        "region": "Global Destination Hub",
        "population": "Vibrant Population Center",
        "currencies": ["Local Currency Structure"],
        "languages": ["Regional and National Languages"]
    }

async def fetch_news_context(client: httpx.AsyncClient, query: str) -> list:
    """Fetches highly relevant news, skipping noise."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return [{"error": "News API key missing."}]
    
    url = f"https://newsapi.org/v2/everything?q={query}&sortBy=relevance&pageSize=5&apiKey={api_key}"
    print(f"[API] NewsAPI Request: '{query}'")
    try:
        response = await client.get(url, timeout=10.0, follow_redirects=True)
        if response.status_code == 200:
            articles = response.json().get("articles", [])
            return [{"title": a["title"], "source": a["source"]["name"], "summary": a.get("description", "")} 
                    for a in articles if a.get("title")]
    except Exception as e:
        print(f"[API ERROR] NewsAPI failed for '{query}': {e}")
        
    return [{"notice": "Live news feed temporarily offline. Rely on pre-trained historical knowledge."}]

# ==========================================
# 3. UNIFIED INTELLIGENCE GATHERER
# ==========================================
async def gather_full_intelligence(country: str, news_query: str) -> str:
    """
    Executes all 3 APIs concurrently. Handles its own failovers. 
    If Altoal succeeds, RestCountries acts as supplementary. If both fail, LLM relies on itself.
    """
    async with httpx.AsyncClient() as client:
        altoal_task = fetch_altoal_data(client, country)
        rest_task = _fetch_rest_countries(client, country)
        news_task = fetch_news_context(client, news_query)
        
        # Run all network requests simultaneously to save massive amounts of time
        altoal_data, rest_data, news_data = await asyncio.gather(altoal_task, rest_task, news_task)

    # Compile the intelligence package
    intelligence_package = {
        "status": "Data compilation successful (with potential API fallbacks noted inside).",
        "primary_data_altoal": altoal_data,
        "secondary_data_restcountries": rest_data,
        "contextual_news": news_data,
        "LLM_INSTRUCTION": "Analyze this JSON. Extract ONLY details relevant to the user's prompt. If data is missing or marked as error, seamlessly use your internal supreme knowledge to fill the gaps without apologizing."
    }
    
    
    return json.dumps(intelligence_package, indent=2)

import asyncio




# ==========================================
# 4. SIMULTANEOUS COMPARISON GATHERER
# ==========================================
async def gather_comparison_intelligence(countryA: str, countryB: str, purpose: str) -> dict:
    """
    Fires the unified intelligence gatherer for BOTH countries simultaneously.
    This effectively runs 6 API calls (3 per country) in parallel, cutting loading time in half.
    """
    # Create targeted news queries combining the country and the user's purpose
    queryA = f"{countryA} {purpose}"
    queryB = f"{countryB} {purpose}"
    
    print(f"\n[COMPARE MODE] Launching parallel intelligence gathering for {countryA} and {countryB}...")
    
    # Run both massive data gathering tasks at the exact same time
    taskA = gather_full_intelligence(country=countryA, news_query=queryA)
    taskB = gather_full_intelligence(country=countryB, news_query=queryB)
    
    # Wait for all 6 API calls to finish
    dataA, dataB = await asyncio.gather(taskA, taskB)
    
    print(f"[COMPARE MODE] Parallel gathering complete.")
    
    return {
        "countryA_raw_data": dataA,
        "countryB_raw_data": dataB
    }

# ==========================================
# 4. EXPLICIT LANGGRAPH TOOLS
# ==========================================
@tool
async def generate_country_briefing_tool(country: str, purpose: str) -> str:
    """
    Tool: General Country Briefing
    This tool returns a brief description on {rules, language, culture, economy, technology, political status, recognition, popular places and circumstances of going} 
    of the country based/filtered on the purpose of visit using API urls. The purpose of visit can be general, business, tourism, education, etc. 
    and the briefing will be optimized for that purpose. please provide the briefing in a concise and informative manner, highlighting the most relevant information for the given purpose.
    Executes a massive data gather (Demographics, Geography, Economy, News) to build an 
    optimized orientation baseline for a specific travel purpose.
    """
    news_query = f"{country} travel {purpose}"
    return await gather_full_intelligence(country, news_query)

@tool
async def compare_countries_tool(countryA: str, countryB: str, purpose: str, basis: str) -> str:
    """
    Tool: Comparative Country Intelligence Gatherer
    Executes a hyper-targeted simultaneous data gather for BOTH countries to establish a deep,
    baseline comparative analysis based on the user's purpose and specific comparison basis.
    """
    try:
        print(f"\n[TOOL FIRED] compare_countries_tool for {countryA} vs {countryB}")
        
        
        raw_intel = await gather_comparison_intelligence(countryA, countryB, purpose)
        
        
        combined_package = {
            "status": "Comparative baseline compilation successful.",
            "basis_of_comparison": basis,
            "countryA_raw_data": raw_intel["countryA_raw_data"],
            "countryB_raw_data": raw_intel["countryB_raw_data"],
            "LLM_INSTRUCTION": (
                f"Analyze this massive dual-country data payload through the lens of '{purpose}' "
                f"and strictly on the comparison basis of '{basis}'.\n"
                "CRITICAL RULES:\n"
                "1. Extract and formulate a deep, point-by-point comparative analysis.\n"
                "2. Do NOT output tables or markdown tables. Use robust, highly detailed paragraphs.\n"
                "3. Ensure the comparison is balanced and highlights pros and cons for both sides.\n"
                "4. If specific data points are missing from the APIs, utilize your supreme internal knowledge to fill the gaps seamlessly without apologizing."
            )
        }
        
        import json
        return json.dumps(combined_package, indent=2)
        
    except Exception as e:
        
        return f"Error gathering comparison data: {str(e)}"


@tool
async def explore_tab_information_tool(country: str, purpose: str, tabName: str) -> str:
    """
    Tool: Tab-Specific Deep Dive
    This tool returns a complete description of the {tabName} on {country} based on the {purpose} using all the information available.
    Drills deep into specific structural topics like education, business, tourism, or technology, providing a highly focused briefing for the user.
    Executes a targeted data gather focused intensely on a single category (e.g., economy, culture, health)
    filtered entirely through the lens of the traveler's purpose.
    """
    news_query = f"{country} {tabName} {purpose}"
    return await gather_full_intelligence(country, news_query)

@tool
async def resolve_user_doubt_tool(country: str, purpose: str, tabName: str, doubt: str) -> str:
    """
    Tool: Specific Doubt Resolution
    This tool returns An answer to the {doubt} related to {tabName} based on the {country} and {purpose} using all the information available.
    highlighting the most relevant information for the given doubt.
    Resolves hyper-specific user questions using targeted live data queries.
    Executes a hyper-targeted data gather to answer a specific user question based on their 
    destination, purpose, and the current tab they are viewing.
    """
    news_query = f"{country} {tabName} {doubt}"
    return await gather_full_intelligence(country, news_query)

@tool
async def resolve_compare_doubt_tool(countryA: str, countryB: str, purpose: str, basis: str, doubt: str) -> str:
    """
    Tool: Comparative Doubt Resolver
    Fetches simultaneous live data for both countries to resolve a specific user doubt regarding their comparison.
    """
    try:
        print(f"\n[TOOL FIRED] resolve_compare_doubt_tool for {countryA} vs {countryB} | Doubt: {doubt}")
        
        
        raw_intel = await gather_comparison_intelligence(countryA, countryB, f"{purpose} {doubt}")
        
        package = {
            "status": "Comparative doubt data gathered successfully.",
            "user_doubt": doubt,
            "basis_of_comparison": basis,
            "countryA_raw_data": raw_intel["countryA_raw_data"],
            "countryB_raw_data": raw_intel["countryB_raw_data"],
            "LLM_INSTRUCTION": (
                f"Read this massive dual-country data and answer the user's specific doubt: '{doubt}'. "
                f"Compare both countries directly based on the data. If the APIs lack the exact answer, "
                f"use your supreme internal knowledge to fill the gaps seamlessly."
            )
        }
        
        import json
        return json.dumps(package, indent=2)
    
    except Exception as e:
        
        return f"Error gathering comparative doubt data: {str(e)}"

# ==========================================
# 5. AGENT ORCHESTRATION & SYSTEM PROMPT
# ==========================================
tools = [generate_country_briefing_tool, compare_countries_tool, explore_tab_information_tool, resolve_user_doubt_tool, resolve_compare_doubt_tool]
tool_node = ToolNode(tools=tools)

# Using 2.5-flash for blazing fast, high-IQ reasoning
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3).bind_tools(tools)

SYSTEM_PROMPT = """You are 'Atlas', an elite, omniscient Travel Intelligence AI. 
You are equipped with tools that feed you massive amounts of raw JSON data from multiple global databases (Altoal, RestCountries, NewsAPI).

YOUR DIRECTIVES:
1. MANDATORY TOOL USE: You must ALWAYS use one of your tools immediately to fetch the raw data payload before answering.
2. INTELLIGENT FILTERING: The tools will give you EVERYTHING about a country. Do NOT summarize everything. You must ruthlessly filter the data based on purpose of visit. 
   - Example: If the purpose is "Exploration/Tourism", ignore GDP deficits and military structure. Focus on geography, culture, transportation, safe zones, and local customs.
   - Example: If the purpose is "Study", focus heavily on academic institutions, cost of living, language, and student visas.
3. THE HYBRID KNOWLEDGE RULE: You are an expert. If the API tools return `{"error": ...}` for a specific fact, or if the API data is sparse, YOU MUST USE YOUR OWN PRE-TRAINED KNOWLEDGE to fill in the gaps seamlessly. Do not ever say "The API didn't provide this." Just answer the question brilliantly.
4. FORMATTING: Output must be stunningly formatted in Markdown. Use bold headers, bulleted lists for readability, and always include a "Pro-Tips / Suggestions" section at the bottom tailored to the user's exact purpose.
5. \nCRITICAL OUTPUT RULE: Use the tool data for understading the specific topics and use your own knowledge base to construct a comprehensive, highly detailed, and academically rigorous report.
                Your reports must be beautifully formatted with highly detailed headings, itemized specifications, and zero placeholders

SINGLE-COUNTRY INTELLIGENCE DIRECTIVES:

For Initial Briefings: When generating the first comprehensive overview of a single country, you MUST use the generate_country_briefing_tool. 
Gather the live data and synthesize it into beautifully structured Markdown, tailored strictly to the user's travel purpose.

For Tab Deep Dives: When asked for a deep dive into a specific category (e.g., Economy, Health, Transport), use the explore_tab_information_tool. 
Filter the massive data payload to extract ONLY what is highly relevant to that specific tab and purpose. Format the output with deep, organized Markdown headers and bullets.

For Specific Doubts: When the user asks a specific follow-up question via the single-country doubt UI, use the resolve_user_doubt tool. 
Cross-reference the live data with the current tab context, and answer the doubt directly, intelligently, and concisely.

COMPARATIVE INTELLIGENCE DIRECTIVES:

For Initial Comparisons: When tasked to compare two countries side-by-side, you MUST use the execute_comparative_analysis tool.
Your final output must strictly follow the Pydantic schema (two corresponding list[str] arrays). 
Never output tables, markdown headers, or single blocks of text for this task. Write robust, point-by-point comparative paragraphs.

For Comparative Doubts: When the user asks a specific follow-up question comparing the two countries, use the resolve_comparative_doubt tool. 
Synthesize the live data into a direct, conversational, and highly accurate answer.
"""

async def call_model(state: AgentState):
    messages_with_system = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = await llm.ainvoke(messages_with_system)
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

graph_agent = workflow.compile()