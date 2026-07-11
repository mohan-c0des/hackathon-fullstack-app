import os
import re
import json
import httpx
import asyncio
from typing import TypedDict, Annotated, List, Dict
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

# ==========================================
# 1. GRAPH STATE
# ==========================================
class JourneyState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

# ==========================================
# 2. THE 7 ASYNC API FETCHERS
# ==========================================

async def fetch_travel_buddy_visa(passport: str, destination: str) -> str:
    """1. Travel Buddy API: Checks Visa Requirements"""
    url = "https://visa-requirement.p.rapidapi.com/v2/visa/check"
    headers = {
        "Content-Type": "application/json",
        "x-rapidapi-host": "visa-requirement.p.rapidapi.com",
        "x-rapidapi-key": os.getenv("RAPIDAPI_KEY", "")
    }
    payload = {"passport": passport, "destination": destination}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if res.status_code == 200:
                data = res.json().get("data", {})
                visa = data.get("visa_rules", {}).get("primary_rule", {})
                mand_reg = data.get("mandatory_registration", {})
                
                result = f"Visa Rule: {visa.get('name', 'Unknown')} ({visa.get('duration', 'N/A')}). "
                if mand_reg:
                    result += f"Mandatory Pre-Registration: {mand_reg.get('name')} (Link: {mand_reg.get('link')}). "
                return result
    except Exception as e:
        print(f"Visa API Error: {e}")
    return "Standard visa regulations apply. Please check local embassy."


async def fetch_tugo_advisory(country_name: str) -> str:
    """2. TuGo API: Fetches Safety & Health Advisories"""
    # Assuming standard REST implementation based on docs
    url = f"https://api.tugo.com/v1/countries/{country_name}"
    headers = {"X-Auth-API-Key": os.getenv("TUGO_API_KEY", "")}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=8.0)
            if res.status_code == 200:
                return str(res.json().get("summary", "Standard safety precautions apply."))
    except Exception:
        pass
    return "Standard safety precautions apply. Review local guidelines before travel."


async def fetch_csc_coordinates(country_iso: str, city: str) -> tuple:
    """3. CountryStateCity API: Gets exact coordinates for ORS and OpenTripMap"""
    url = f"https://api.countrystatecity.in/v1/countries/{country_iso}/cities"
    headers = {"X-CSCAPI-KEY": os.getenv("CSCAPI_KEY", "")}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=12.0)
            if res.status_code == 200:
                for c in res.json():
                    if c["name"].lower() == city.lower():
                        return float(c.get("longitude")), float(c.get("latitude"))
    except Exception as e:
        print(f"CSC API Error: {e}")
    return None, None


async def fetch_ors_routing(lon1: float, lat1: float, lon2: float, lat2: float) -> str:
    """4. OpenRouteService API: Routing distance between origin and destination"""
    if not lon1 or not lon2: return "Coordinate data missing for precise routing."
    url = f"https://api.openrouteservice.org/v2/directions/driving-car"
    headers = {
        "Authorization": os.getenv("ORS_API_KEY", ""), 
        "Content-Type": "application/json"
    }
    payload = {"coordinates": [[lon1, lat1], [lon2, lat2]]}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if res.status_code == 200:
                dist = res.json()["features"][0]["properties"]["summary"]["distance"] / 1000
                duration = res.json()["features"][0]["properties"]["summary"]["duration"] / 3600
                return f"Driving Distance: {dist:.2f} km. Estimated Time: {duration:.2f} hours."
    except Exception as e:
        print(f"ORS API Error: {e}")
    return "Routing currently unavailable."


async def fetch_apiverve_currency_weather(city: str) -> str:
    """5. ApiVerve: Fetch weather data for the city"""
    url = f"https://api.apiverve.com/v1/weather?city={city}"
    headers = {
        "X-API-Key": os.getenv("APIVERVE_KEY", ""), 
        "Accept": "application/json"
    }
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=8.0)
            if res.status_code == 200: 
                return str(res.json().get("data", "Weather normal."))
    except Exception: pass
    return "Real-time weather data currently offline."


async def fetch_opentripmap_pois(lon: float, lat: float) -> str:
    """6. OpenTripMap API: Finds attractions around a coordinate"""
    if not lon or not lat: return "No coordinates provided for POIs."
    url = f"https://api.opentripmap.com/0.1/en/places/radius?radius=10000&lon={lon}&lat={lat}&kinds=cultural,architecture,museums,historic&apikey={os.getenv('OPENTRIPMAP_API_KEY')}"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=10.0)
            if res.status_code == 200:
                features = res.json().get("features", [])
                places = [f["properties"]["name"] for f in features[:8] if f["properties"].get("name")]
                return "Key Local Attractions: " + ", ".join(places)
    except Exception as e:
        print(f"OpenTripMap Error: {e}")
    return "No major POIs found nearby."


async def fetch_wikivoyage(city: str) -> str:
    """7. Wikimedia Enterprise (WikiVoyage): Authenticates and fetches historical data"""
    auth_url = "https://auth.enterprise.wikimedia.com/v1/login"
    api_url = f"https://api.enterprise.wikimedia.com/v2/structured-contents/{city}"
    
    try:
        async with httpx.AsyncClient() as client:
            # Step A: Handshake
            auth_res = await client.post(auth_url, json={
                "username": os.getenv("WIKI_USERNAME", ""), 
                "password": os.getenv("WIKI_PASSWORD", "")
            }, timeout=8.0)
            
            token = auth_res.json().get("access_token")
            if not token: return "WikiVoyage authentication failed."
            
            # Step B: Fetch Data
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            payload = {"filters": [{"field": "is_part_of.identifier", "value": "enwikivoyage"}], "limit": 1}
            res = await client.post(api_url, headers=headers, json=payload, timeout=12.0)
            
            if res.status_code == 200:
                data = res.json()[0]
                abstract = data.get('abstract', '')
                sections = [s.get('name') for s in data.get('sections', [])]
                return f"WikiVoyage Abstract: {abstract[:500]}...\nMajor Sections Available: {sections}"
    except Exception as e:
        print(f"WikiVoyage Error: {e}")
    return "Historical context unavailable."


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
    
    # Grab the V5 API key from your environment
    api_key = os.getenv("RESTCOUNTRIES_V5_KEY")
    if not api_key:
        print("[API ERROR] RESTCOUNTRIES_V5_KEY is missing from environment variables.")
        return _get_fallback_data(country)

    # V5 Endpoint implementation with Bearer authentication
    url = f"https://api.restcountries.com/countries/v5?q={clean_country}&limit=1"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    print(f"\n[API CALL] Fetching RestCountries V5 data for: {clean_country}...")
    try:
        # httpx requires follow_redirects=True for enterprise routing
        response = await client.get(url, headers=headers, timeout=10.0, follow_redirects=True)
        print(f"[API RESPONSE] RestCountries V5 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            raw_data = response.json()
            country_data = raw_data[0] if isinstance(raw_data, list) and len(raw_data) > 0 else {}
            
            # FIX: Safely format the population only if it's a number
            pop = country_data.get('population', 'Unknown')
            pop_str = f"{pop:,}" if isinstance(pop, int) else str(pop)
            
            return {
                "name": country_data.get("names", {}).get("common", country.capitalize()),
                "capital": country_data.get("capital", ["Unknown"])[0] if isinstance(country_data.get("capital"), list) else "Unknown",
                "region": country_data.get("region", "Unknown"),
                "population": pop_str, # Use the safe string here
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
    
    # We dump it to a string because LangGraph tools must return strings
    return json.dumps(intelligence_package, indent=2)

@tool
async def fetch_live_country_data(country: str, news_query: str) -> str:
    """
    CRITICAL TOOL: ALWAYS execute this tool FIRST to fetch real-time data, 
    news, currency, and structural facts about the target country BEFORE generating 
    any travel plans, pre-travel steps, transit steps, or clarifying doubts.
    """
    return await gather_full_intelligence(country, news_query)

# ==========================================
# 3. PHASE-SPECIFIC LANGGRAPH TOOLS
# ==========================================

@tool
async def generate_pre_travelling_steps(
    name: str, gender: str, role: str, age: int,
    country: str, origin_city: str, nationality_iso: str, 
    citizenship: str, bio: str, health_condition: str,
    passport_expiry: str, passport_blank_pages: str,
    purpose: str, target_country: str, target_iso: str, exact_destination: str,
    travel_duration: str, add_ons: str, extra_info: str
) -> str:
    """This Tool Generates the pre-traveling phase steps:
    Firstly, consider user personal data {name}, {gender}, {age}, {role}, {health_condition} - not only for the way how you talk but for the journey rules/restrictions.
    Secondly, consider his travel data from user {country}, {origin_city}, to {target_country}, {exact_destination}, {purpose} - proceed steps highly focused on {purpose}.
    Thirdly, CRITICAL: Integrate the LIVE API DATA fetched by this tool -> {visa_data} and {safety_data}.
    Then, consider other {extra_info}, {add_ons}, {travel_duration}, {citizenship}, {passport_expiry}, {passport_blank_pages}, {bio} - check if anything violates anything while journey (airport rules, etc).
    Finally, Provide all the documents (documents to be carried to airport, documents to be carried to destination) highly focused/based on the complete user data and the API Visa data.
    Required step-by-step, the necessary preparations and advices for travelling to the destination analysing all the user data.
    NOTE: 
    1. As already said, first create the appropriate step names before assigning the values into it.
    CRITICAL NOTE - 2. If anything from the user data or the API Visa data is violating and against the rules of travel (like expired passport), just return that he/she is not eligible and terminate all the next steps here itself.
    3. Your final step is to guide the user to book flight tickets.
    4. For every document, try to provide text in brackets, how can the user get that document if he/she does not have one (like online link where user can get that document)."""
    # Parallel API Execution
    visa_data, safety_data = await asyncio.gather(
        fetch_travel_buddy_visa(nationality_iso, target_iso),
        fetch_tugo_advisory(target_country)
    )
    
    return f"""
    [REAL-TIME API KNOWLEDGE BASE FOR PRE-TRAVEL]
    Visa & Entry Docs: {visa_data}
    Travel Advisories: {safety_data}
    
    CRITICAL INSTRUCTION: Analyze the user's passport_expiry and blank_pages. If they violate the rules in the Visa & Entry Docs, terminate the journey politely. 
    Otherwise, generate structured Pre-Travel steps based purely on this API data and their '{purpose}'.
    """

@tool
async def generate_transit_steps(
    origin_country_iso: str, origin_city: str,
    target_iso: str, exact_destination: str,
    travel_duration: str, purpose: str,
    name: str, gender: str, role: str, age: int,
    country: str, nationality_iso: str,
    citizenship: str, bio: str, health_condition: str,
    passport_expiry: str, passport_blank_pages: str,
    target_country: str, add_ons: str, extra_info: str
) -> str:
    """This tool Generates the transit-phase steps:
    Analysing all the user data, especially travel data {country}, {origin_city}, to {target_country}, {exact_destination}, {purpose}.
    CRITICAL: Integrate the LIVE API DATA fetched by this tool -> {origin_coordinates}, {dest_coordinates}, and {route_data}.
    Considering the location's exact latitude and longitude (provided by apis), airport latitude and longitude, destination airport and city latitude and longitude -
    generate the steps that starts with guiding the user from user's place to reach the airport (nearest, provide the ways he can get to airport), from there to destination country airport and finally to the destination city.
    This tool's generated steps are explicitly based on the core travelling - advices should be about transport, routes, hotels he can stay in using the API routing data.
    Finally, after all steps, final goal is to make the user arrive to the exact {exact_destination}, and make him stay in a hotel, or anywhere else in city completely based on user {purpose}."""
    # 1. Map Cities to Coordinates (Parallel)
    (lon1, lat1), (lon2, lat2) = await asyncio.gather(
        fetch_csc_coordinates(origin_country_iso, origin_city),
        fetch_csc_coordinates(target_iso, exact_destination)
    )
    
    # 2. Get Routing Data if coordinates exist
    route_data = "Routing skipped (Coordinates not found)."
    if lon1 and lon2:
        route_data = await fetch_ors_routing(lon1, lat1, lon2, lat2)
    
    return f"""
    [REAL-TIME API KNOWLEDGE BASE FOR TRANSIT]
    Origin [{origin_city}]: [{lon1}, {lat1}] 
    Destination [{exact_destination}]: [{lon2}, {lat2}]
    ORS Routing/Distance Data: {route_data}
    
    INSTRUCTION: Generate structured transit steps, airport procedures, and route navigation based on this exact geographic data.
    """

@tool
async def generate_post_travelling_steps(
   role: str,name: str, gender: str, age: int,
    country: str,origin_city: str, nationality_iso: str,
     citizenship: str,bio: str,health_condition: str,
    passport_expiry: str,passport_blank_pages: str,purpose: str,
    target_country: str,target_iso: str, exact_destination: str,
    travel_duration: str, add_ons: str,extra_info: str
) -> str:
    """This Tool Generates post-travelling steps for the journey:
    Consider and analyse complete user data, especially {purpose}, {travel_duration}, {health_condition}, {role}.
    CRITICAL: Integrate the LIVE API DATA fetched by this tool -> {weather_data}, {wiki_data} (history/culture), and {poi_data} (attractions).
    Give all the data about how user could survive in the {exact_destination} by phrasing information like hotels, rents, places to go, food, etc., heavily utilizing the API POIs and weather context.
    Also give advices and preparations for the next steps he has to do based on the {purpose}.
    Final goal is to achieve the way of living in {exact_destination}.
    After all, final step should be completely saying farewell and appreciating that user did a great job."""
    # 1. We need the coordinates again for OpenTripMap
    lon, lat = await fetch_csc_coordinates(target_iso, exact_destination)
    
    # 2. Parallel fetch for all local intelligence
    weather_data, poi_data, wiki_data = await asyncio.gather(
        fetch_apiverve_currency_weather(exact_destination),
        fetch_opentripmap_pois(lon, lat) if lon and lat else asyncio.sleep(0),
        fetch_wikivoyage(exact_destination)
    )
    
    return f"""
    [REAL-TIME API KNOWLEDGE BASE FOR POST-TRAVEL]
    Local Weather context: {weather_data}
    OpenTripMap Notable POIs: {poi_data}
    WikiVoyage History & Culture: {wiki_data}
    
    INSTRUCTION: Generate post-travel survival steps, hotel/stay recommendations, and cultural itineraries based exactly on these POIs and Weather.
    """

# In app/JourneyAgent.py

@tool
def structure_complete_journey_plan(
    pre_travel_output: List[Dict[str, str]], 
    transit_output: List[Dict[str, str]], 
    post_travel_output: List[Dict[str, str]]
) -> str:
    """Structure the complete journey plan.
    You MUST output a LIST of dictionaries for each phase, where each dictionary has a single key (the step name) and a single value (the instruction).
    Example: [{"Passport": "Check expiry..."}, {"Flight": "Book ticket..."}]
    This guarantees chronological order.
    """
    return "Successfully structured. Router will intercept this payload."

@tool
async def clarify_doubts(question: str, current_step: str, exact_destination: str, target_country_iso: str) -> str:
    """Doubts clarification tool: after gaining all the information from apis, understand the data and question, and use your own knowledge to Clarify doubts.
    If the doubt requires real-time data (like hotels or weather), it fetches it here.
    NOTE: After doubt is clarified, ask user for continuing the current journey step.""" 
    
    # DYNAMIC API FETCHING BASED ON DOUBT
    extra_context = ""
    question_lower = question.lower()
    
    if "hotel" in question_lower or "place" in question_lower or "visit" in question_lower:
        # --- REPLACED HARDCODED "US" WITH DYNAMIC ISO ---
        lon, lat = await fetch_csc_coordinates(target_country_iso, exact_destination) 
        extra_context += await fetch_opentripmap_pois(lon, lat)
    if "weather" in question_lower or "climate" in question_lower:
        extra_context += await fetch_apiverve_currency_weather(exact_destination)
    if "history" in question_lower or "culture" in question_lower:
        extra_context += await fetch_wikivoyage(exact_destination)
        
    return f"""
    [REAL-TIME DOUBT RESOLUTION DATA]
    User Asked: {question}
    Current Step: {current_step}
    Live API Context Pulled for Doubt: {extra_context}
    
    INSTRUCTION: Answer the doubt thoroughly using the context above.
    """

# ==========================================
# 4. AGENT & GRAPH ORCHESTRATION
# ==========================================

tools = [
    generate_pre_travelling_steps, 
    generate_transit_steps, 
    generate_post_travelling_steps, 
    structure_complete_journey_plan, 
    clarify_doubts,
    fetch_live_country_data
]
tool_node = ToolNode(tools=tools)

# Using Claude 3.5 Sonnet for master-level state tracking
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.3).bind_tools(tools)

system_prompt = """Your name is Boomer, a Travel Concierge Agent.
YOUR ROLE: 
    1. Plan the complete journey for users based on the user-provided information and live API data, guiding users throughout their journey from origin to destination in terms of steps.
    2. Complete journey plan includes: pre-traveling steps, transit steps, and post-traveling steps.
    3. Also clarify any doubts the user may have regarding their journey.

TOOL SEQUENCE & WHEN TO USE WHAT:
    There are two types of queries the user can send:
        (i) User-data (information about the user and journey)
        (ii) User-doubt (question or doubt the user has regarding their journey)
    1. When the query is User-data (information about the user and journey):
        Run/call these 5 tools in this order:
        fetch_live_country_data -> generate_pre_travelling_steps -> generate_transit_steps -> generate_post_travelling_steps -> structure_complete_journey_plan
    2. When the query is User-doubt (question or doubt the user has regarding their journey):
        Run/call this 2 tools: "clarify_doubts"
    When a user asks to initialize a mission/requests travel plans or questions in journey, you MUST FIRST call the `fetch_live_country_data` tool using their destination.
    Use the JSON data returned from that tool to accurately fuel your responses for `generate_pre_travelling_steps`, `generate_transit_steps`, and `generate_post_travelling_steps` or clarify_doubts.
        
CRITICAL & COMMON APPROACH IN PRE-TRAVELING, TRANSIT, POST-TRAVELING:
    1. For each phase, first generate all the stepNames (variables) required for that phase (for all the information - including documents, preparations, guidance and advices) using the respective tool and the injected LIVE API DATA.
    2. Then, for each stepName (variable), generate and assign the necessary information and advices to the stepName (it should be like keys and values in a dictionary).
    For example: output generated from pre-travelling-tool for India-US journey; 
        "Passport" : "Valid passport (recommended validity at least 6 months beyond stay; e-Passport required for VWP)",
        "Visa or ESTA" : "ESTA for Visa Waiver Program countries (apply online in advance); B-1/B-2 visa for others (DS-160 + interview)",
        "Proof of Ties to Home Country" : "Job letter, property docs, family ties to show intent to return",
        "Itinerary and Return Ticket" : "Detailed travel plans + confirmed return/onward flight",
        "Proof of Accommodation" : "Hotel bookings or invitation letter with address",
        "Proof of Sufficient Funds" : "Bank statements, sponsor letter, or credit card proofs",
        "Customs Declaration Form" : "CBP Form 6059B (one per family; declare goods/foods)",
        "Travel Insurance" : "Comprehensive policy covering medical, trip cancellation, baggage",
        "Vaccinations" : "Up-to-date routine vaccines (measles, etc.); no COVID proof required",
        "Flight and Booking Confirmations" : "Printed/digital copies of all reservations",
        "Supporting Documents for Entry" : "Invitation letters, conference registration, etc. (as applicable)",
        "Digital and Physical Copies" : "Backups of all important documents (passport, visa/ESTA, itinerary)",
        "Notify Bank and Contacts" : "Inform bank of travel; share emergency contacts and itinerary",
        "Purpose of Visit Evidence" : "Documents explaining tourism/business/study purpose",
        "Health Preparations" : "Any required medications with prescriptions; check CDC travel health",
        "Advice1" : "Some USD cash + international cards (notify bank)",
        "Advice2" : "Download CBP apps; consider Global Entry if eligible"
    
    NOTE:
        1. This is just a reference, but you have to filter data for what is most necessary, intelligently add context from the APIs, and add optionalities.
        2. After completing each phase, an appreciation stepName (key) and its appreciation message (value) must be provided.
        3. For every advice and appreciation, stepName should be only like - [Advice] and for Appreciation; [Appreciation], guidance and preparation stepNames must be their own.
        4. Minimum words geneartion per step(in all phases) - 50 words. feel free to generate 50+ with best reasoning.
    3. Store the generated steps and information from all 3 travel-phase tools in your memory to use it all in the `structure_complete_journey_plan` tool.

HOW TO PROVIDE INFORMATION IN ALL 3 TRAVEL-PHASE TOOLS:
    1. Pre-traveling steps: Provide all the documents required and the necessary preparations for travelling to the destination.
        CRITICAL NOTE: Analyze the whole userData and API Visa data. If anything is violating travel rules (e.g., passport expires too soon), return that he/she is not eligible and terminate next steps.
    2. Transit steps: Guide the user travelling from origin to destination using the coordinates and routing API data.
    3. Post-traveling steps: Provide information that guides the user to achieve the way of living in the destination city utilizing the API Weather, POIs, and WikiVoyage data.
    
    NOTE:
        1. Each phase should be planned in a way that the user can achieve their purpose/requirements.
        2. Every time you want to say anything to the user, address user with user's name.
        3. CRITICAL: Gain all information/knowledge from the APIS, and use your own reasoning to generate steps only based on the user data [age, purpose, health conditions].
        4. Your tone should be so friendly that user should feel you are a companion travelling with him/her.

FINAL OUTPUT STRUCTURE FROM `structure_complete_journey_plan` TOOL:
    MANDATORY FORMATTING RULE: You MUST NEVER return the final travel plan as standard conversational text to the user. 
    AFTER USING ALL 3 TRAVEL PHASE TOOLS - YOUR VERY LAST ACTION MUST BE calling the `structure_complete_journey_plan` tool. 
    To preserve chronological order, you must pass your generated steps as a LIST of dictionaries (List[Dict[str, str]]).
    Example format: [{"Step 1 Name": "Step 1 Details"}, {"Step 2 Name": "Step 2 Details"}]
"""

async def call_model(state: JourneyState):
    messages = state["messages"]
    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=system_prompt)] + messages
    
    # Fully async LLM invocation
    response = await llm.ainvoke(messages)
    return {"messages": [response]}

workflow = StateGraph(JourneyState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

# Memory Saver ensures doubts are linked to the original plan!
memory = MemorySaver()
boomer_agent = workflow.compile(checkpointer=memory)