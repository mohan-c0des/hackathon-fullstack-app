import os
import httpx
import ast
import traceback
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends
from langchain_core.messages import HumanMessage
import asyncio
import textwrap

from fastapi.responses import StreamingResponse
import json
# Schemas
from app.schemas import (
    SidebarRequest, Tabs, Doubt, TranslatePayload,
    CompareRequest, ComparisonOutput, CompareDoubt
)
# AI Agents & DB
from app.LangGraphAgents.BriefingAgent import graph_agent, gather_comparison_intelligence, llm
from langchain_core.prompts import ChatPromptTemplate
from app.database import graph_db

# Security
from app.security import get_optional_user

load_dotenv()

router = APIRouter()

# ==========================================
# 2. INTELLIGENCE DASHBOARD ROUTES
# ==========================================

@router.get("/api/quick-intel", response_model=dict)
async def get_quick_hud_intel(country: str, user_id: str = Depends(get_optional_user)):
    """Fetches instant HUD data using Altoal API, RestCountries V5 fallback, and Neo4j."""
    
    altoal_slug = country.lower().replace(" ", "-")
    
    hud_data = {
        "population": "Unknown", "states": "1", "government": "Republic", 
        "leader": "Head of State", "language": "Unknown", "religion": "Unknown", 
        "capital": "Unknown", "area": "Unknown",
        "rec_culture": [], "rec_language": [], "rec_relations": [], "rec_economy": []
    }

    # ULTIMATE EXTRACTOR: Mathematically guarantees React NEVER gets a dict
    def extract_pure_text(obj) -> str:
        if isinstance(obj, str):
            obj = obj.strip()
            # Catch stringified dictionaries if they slip through
            if obj.startswith("{") and obj.endswith("}"):
                try:
                    parsed = ast.literal_eval(obj)
                    if isinstance(parsed, dict):
                        return extract_pure_text(parsed)
                except:
                    pass
            return obj
        if isinstance(obj, (int, float)):
            return str(obj)
        if isinstance(obj, list) and len(obj) > 0:
            return extract_pure_text(obj[0])
        if isinstance(obj, dict):
            # Prioritize standard Altoal text keys
            for k in ["name", "common", "text", "string", "String", "value"]:
                if k in obj and isinstance(obj[k], (str, int, float)):
                    return str(obj[k]).strip()
            # If standard keys fail, recursively search the values
            for v in obj.values():
                res = extract_pure_text(v)
                if res: return res
        return ""

    # 1. ALTOAL API (Indestructible Forgiving Extraction)
    try:
        altoal_url = f"https://countries.altoal.com/api/v1/name/{altoal_slug}.json"
        async with httpx.AsyncClient() as client:
            resp = await client.get(altoal_url, timeout=5.0)
            if resp.status_code == 200:
                c_data = resp.json().get("data", {})
                
                if isinstance(c_data, dict):
                    # --- PEOPLE & SOCIETY ---
                    pas = c_data.get("people_and_society", {})
                    if isinstance(pas, dict):
                        # Population
                        pop_str = extract_pure_text(pas.get("population", {}))
                        if pop_str:
                            clean_num = ''.join(filter(str.isdigit, pop_str))
                            if clean_num: hud_data["population"] = f"{int(clean_num):,}"
                            else: hud_data["population"] = pop_str
                        
                        # Religion
                        rel_str = extract_pure_text(pas.get("religions", {}))
                        if rel_str: hud_data["religion"] = rel_str.split("(")[0].strip()

                        # Language
                        lang_str = extract_pure_text(pas.get("languages", {}))
                        if lang_str: hud_data["language"] = lang_str.split("(")[0].strip()

                    # --- GEOGRAPHY ---
                    geo = c_data.get("geography", {})
                    if isinstance(geo, dict):
                        area_str = extract_pure_text(geo.get("area", {}))
                        if area_str:
                            clean_area = ''.join(filter(str.isdigit, area_str))
                            if clean_area: hud_data["area"] = f"{int(clean_area):,} km²"
                            else: hud_data["area"] = f"{area_str} km²"

                    # --- GOVERNMENT ---
                    gov = c_data.get("government", {})
                    if isinstance(gov, dict):
                        # Gov Type
                        gov_type = extract_pure_text(gov.get("government_type", {}))
                        if gov_type: hud_data["government"] = gov_type.title()
                            
                        # Capital
                        cap_val = extract_pure_text(gov.get("capital", {}))
                        if cap_val: hud_data["capital"] = cap_val

                        # Leader
                        exec_b = gov.get("executive_branch", {})
                        if isinstance(exec_b, dict):
                            lead_node = exec_b.get("head_of_government") or exec_b.get("chief_of_state", {})
                            lead_str = extract_pure_text(lead_node)
                            if lead_str: hud_data["leader"] = lead_str.split("(")[0].replace("President", "").replace("Prime Minister", "").strip()
                        
                        # States count (Summing arrays to get accurate counts)
                        admin_divs = gov.get("administrative_divisions", {}).get("value", {})
                        if isinstance(admin_divs, dict):
                            total_states = sum(len(v) for v in admin_divs.values() if isinstance(v, list))
                            if total_states > 0:
                                hud_data["states"] = str(total_states)
                            else:
                                hud_data["states"] = str(len(admin_divs.keys()))

    except Exception as e:
        print(f"[ALTOAL PARSE WARNING] {e}")

    # 2. PREMIUM RESTCOUNTRIES V5 EXACT FALLBACK
    if hud_data["population"] == "Unknown" or hud_data["capital"] == "Unknown":
        try:
            api_key = os.getenv("RESTCOUNTRIES_V5_KEY")
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
            rc_url = f"https://api.restcountries.com/countries/v5/names.common/{country.title()}"
            
            async with httpx.AsyncClient() as client:
                rc_resp = await client.get(rc_url, headers=headers, timeout=5.0)
                if rc_resp.status_code == 200:
                    rc_json = rc_resp.json()
                    if isinstance(rc_json, dict) and "data" in rc_json:
                        objects_list = rc_json["data"].get("objects", [])
                        if isinstance(objects_list, list) and len(objects_list) > 0:
                            rc_data = objects_list[0]
                            if isinstance(rc_data, dict):
                                pop = rc_data.get("population")
                                if pop and hud_data["population"] == "Unknown": 
                                    hud_data["population"] = f"{int(float(pop)):,}"
                                
                                area_val = rc_data.get("area", {}).get("kilometers")
                                if area_val and hud_data["area"] == "Unknown": 
                                    hud_data["area"] = f"{int(float(area_val)):,} km²"
                                
                                cap_tree = rc_data.get("capitals")
                                if isinstance(cap_tree, list) and len(cap_tree) > 0 and hud_data["capital"] == "Unknown":
                                    hud_data["capital"] = str(cap_tree[0].get("name", "Unknown"))
                                
                                lang_tree = rc_data.get("languages", {})
                                if isinstance(lang_tree, dict) and len(lang_tree) > 0 and hud_data["language"] == "Unknown":
                                    hud_data["language"] = str(list(lang_tree.values())[0])
        except Exception as e:
            print(f"[PREMIUM FALLBACK ERROR] {e}")

    # 3. NEO4J GRAPH RECOMMENDATIONS
    try:
        query = """
        MATCH (target:Country {name: $country})
        OPTIONAL MATCH (target)-[:BELONGS_TO]->(:CultureGroup)<-[:BELONGS_TO]-(cult:Country) WHERE cult.name <> target.name
        OPTIONAL MATCH (target)-[:SPEAKS]->(:Language)<-[:SPEAKS]-(lang:Country) WHERE lang.name <> target.name
        OPTIONAL MATCH (target)-[:DEEP_RELATION]-(ally:Country) WHERE ally.name <> target.name
        OPTIONAL MATCH (target)-[:USES]->(:Currency)<-[:USES]-(econ:Country) WHERE econ.name <> target.name
        RETURN 
            collect(DISTINCT cult.name)[0..2] AS similar_culture,
            collect(DISTINCT lang.name)[0..2] AS similar_language,
            collect(DISTINCT ally.name)[0..2] AS relations,
            collect(DISTINCT econ.name)[0..2] AS similar_economy
        """
        async with graph_db.driver.session() as session:
            result = await session.run(query, country=country.title())
            record = await result.single()
            if record:
                # Rigorously filter out any None/Null values returning from Neo4j
                hud_data["rec_culture"] = [c for c in (record["similar_culture"] or []) if c is not None]
                hud_data["rec_language"] = [l for l in (record["similar_language"] or []) if l is not None]
                hud_data["rec_relations"] = [r for r in (record["relations"] or []) if r is not None]
                hud_data["rec_economy"] = [e for e in (record["similar_economy"] or []) if e is not None]
            else:
                print(f"[GRAPH INFO] No Neo4j connections found for {country}. (Unseeded country)")
    except Exception as e:
        print(f"[GRAPH WARNING] Failed to fetch recommendations: {str(e)}")

    # 4. HACKATHON LEADER OVERRIDES (Guarantees perfect names for the presentation)
    HACKATHON_LEADER_FALLBACKS = {
    # Original Base
    "india": "Narendra Modi", "united-states": "Joe Biden", "china": "Xi Jinping", "russia": "Vladimir Putin",
    "japan": "Shigeru Ishiba", "united-kingdom": "Keir Starmer", "france": "Emmanuel Macron", "germany": "Friedrich Merz",
    "saudi-arabia": "Mohammed bin Salman", "south-korea": "Yoon Suk Yeol", "brazil": "Luiz Inácio Lula da Silva",
    "canada": "Justin Trudeau", "australia": "Anthony Albanese",

    # Europe & Nordics
    "italy": "Giorgia Meloni", "spain": "Pedro Sánchez", "netherlands": "Dick Schoof", "switzerland": "Viola Amherd",
    "sweden": "Ulf Kristersson", "norway": "Jonas Gahr Støre", "poland": "Donald Tusk", "greece": "Kyriakos Mitsotakis",
    "turkey": "Recep Tayyip Erdoğan", "portugal": "Luís Montenegro", "austria": "Karl Nehammer", "ireland": "Simon Harris",
    "croatia": "Andrej Plenković", "czech-republic": "Petr Fiala", "hungary": "Viktor Orbán", "belgium": "Alexander De Croo",
    "denmark": "Mette Frederiksen", "finland": "Petteri Orpo", "iceland": "Bjarni Benediktsson", "ukraine": "Volodymyr Zelenskyy",
    "romania": "Marcel Ciolacu", "serbia": "Aleksandar Vučić", "slovakia": "Robert Fico", "estonia": "Kristen Michal",
    "latvia": "Evika Siliņa", "lithuania": "Gitanas Nausėda",

    # Asia-Pacific
    "singapore": "Lawrence Wong", "vietnam": "To Lam", "thailand": "Paetongtarn Shinawatra", "indonesia": "Prabowo Subianto",
    "malaysia": "Anwar Ibrahim", "philippines": "Bongbong Marcos", "new-zealand": "Christopher Luxon", "taiwan": "Lai Ching-te",
    "pakistan": "Shehbaz Sharif", "bangladesh": "Muhammad Yunus", "sri-lanka": "Anura Kumara Dissanayake", "nepal": "K.P. Sharma Oli",
    "maldives": "Mohamed Muizzu", "kazakhstan": "Kassym-Jomart Tokayev",

    # Middle East & Africa
    "united-arab-emirates": "Mohamed bin Zayed Al Nahyan", "israel": "Benjamin Netanyahu", "qatar": "Tamim bin Hamad Al Thani",
    "oman": "Haitham bin Tariq", "jordan": "Abdullah II", "iran": "Masoud Pezeshkian", "iraq": "Mohammed Shia' Al Sudani",
    "egypt": "Abdel Fattah el-Sisi", "south-africa": "Cyril Ramaphosa", "nigeria": "Bola Tinubu", "kenya": "William Ruto",
    "morocco": "Mohammed VI", "ethiopia": "Abiy Ahmed", "tanzania": "Samia Suluhu Hassan", "ghana": "Nana Akufo-Addo",
    "algeria": "Abdelmadjid Tebboune", "tunisia": "Kais Saied", "senegal": "Bassirou Diomaye Faye", "uganda": "Yoweri Museveni",
    "rwanda": "Paul Kagame", "angola": "João Lourenço", "zambia": "Hakainde Hichilema",

    # Americas & Caribbean
    "mexico": "Claudia Sheinbaum", "argentina": "Javier Milei", "colombia": "Gustato Petro", "chile": "Gabriel Boric",
    "peru": "Dina Boluarte", "costa-rica": "Rodrigo Chaves", "panama": "José Raúl Mulino", "jamaica": "Andrew Holness",
    "cuba": "Miguel Díaz-Canel", "ecuador": "Daniel Noboa", "bolivia": "Luis Arce", "uruguay": "Luis Lacalle Pou",
    "paraguay": "Santiago Peña", "venezuela": "Nicolás Maduro"
}
    if altoal_slug in HACKATHON_LEADER_FALLBACKS:
        hud_data["leader"] = HACKATHON_LEADER_FALLBACKS[altoal_slug]

    # 5. NEO4J HISTORY TRACKING: Log this click to the database
    try:
        await graph_db.log_user_search(user_id, country, "Quick Intel Scan")
    except Exception as e:
        print("History Logging Error:", e)

    # 6. ABSOLUTE REACT SAFETY NET
    for key, value in hud_data.items():
        if isinstance(value, list):
            hud_data[key] = [extract_pure_text(i) if isinstance(i, dict) else str(i) for i in value if i is not None]
        else:
            hud_data[key] = extract_pure_text(value) if isinstance(value, dict) else str(value)

    return {"data": hud_data}

@router.post("/api/briefing")
async def generate_country_briefing(
    request: SidebarRequest, 
    user_id: str = Depends(get_optional_user)
):
    """Generates the initial comprehensive country briefing optimized for the user's purpose."""
    try:
        # 1. Log the search in Neo4j (Non-blocking tracking)
        try:
            await graph_db.log_user_search(user_id=user_id, country_name=request.country, purpose=request.purpose)
        except Exception as e:
            print(f"[GRAPH WARNING] Could not log search: {str(e)}")

        # 2. Extract similar matching options from Graph engine
        suggestions = []
        try:
            suggestions = await graph_db.get_similar_countries(country_name=request.country)
        except Exception as e:
            print(f"[GRAPH WARNING] Could not pull recommendations: {str(e)}")

        # ==========================================
        # CACHE INTERCEPTOR
        # ==========================================
        try:
            cached_content = await graph_db.get_cached_briefing(user_id, request.country, request.purpose)
            if cached_content:
                print(f"[CACHE HIT] Returning saved briefing for {request.country} ({request.purpose})")
                
                if user_id != "guest_user":
                    try:
                        await graph_db.save_briefing(user_id, request.country, request.purpose, cached_content)
                    except Exception:
                        pass
                
                # Stream the cached content with a simulated typing effect!
                async def cache_generator():
                    # Send metadata first
                    yield json.dumps({"type": "metadata", "graph_recommendations": suggestions}) + "\n"
                    
                    # Chop the massive cached string into chunks of 15 characters
                    chunk_size = 15
                    for i in range(0, len(cached_content), chunk_size):
                        chunk = cached_content[i:i+chunk_size]
                        yield json.dumps({"type": "chunk", "text": chunk}) + "\n"
                        
                        # Add a tiny artificial delay (0.01 seconds) to simulate the AI typing!
                        await asyncio.sleep(0.01) 
                
                return StreamingResponse(cache_generator(), media_type="application/x-ndjson")
        except Exception as e:
            print(f"[GRAPH WARNING] Cache check failed: {str(e)}")
        # ==========================================

        # 3. Trigger the AI Agent
        prompt = (
            f"GOAL: INITIAL BRIEFING.\n"
            f"Target Country: {request.country}\n"
            f"Travel Purpose: {request.purpose}\n"
            f"Task: Execute your briefing tool to gather data. Then, synthesize a beautifully structured "
            f"overview tailored strictly to the purpose of '{request.purpose}'. Include relevant suggestions."
        )

        async def stream_generator():
            # Yield graph recommendations first
            yield json.dumps({"type": "metadata", "graph_recommendations": suggestions}) + "\n"
            
            final_text = ""
            try:
                # Robustly stream tokens and satisfy strict type checkers
                async for event in graph_agent.astream_events({"messages": [HumanMessage(content=prompt)]}, version="v2"):
                    if event.get("event") == "on_chat_model_stream":
                        
                        # SAFELY extract the chunk using .get()
                        chunk_obj = event.get("data", {}).get("chunk")
                        
                        if chunk_obj and hasattr(chunk_obj, "content"):
                            chunk = chunk_obj.content
                            
                            if isinstance(chunk, str) and chunk:
                                final_text += chunk
                                yield json.dumps({"type": "chunk", "text": chunk}) + "\n"
                            elif isinstance(chunk, list):
                                text_chunk = "".join([c.get("text", "") for c in chunk if isinstance(c, dict)])
                                if text_chunk:
                                    final_text += text_chunk
                                    yield json.dumps({"type": "chunk", "text": text_chunk}) + "\n"
            except Exception as e:
                yield json.dumps({"type": "error", "text": f"\n\n[Connection Error] Stream interrupted: {str(e)}"}) + "\n"

            # ==========================================
            # SAVE TO CACHE (After Stream Finishes)
            # ==========================================
            try:
                await graph_db.save_briefing(user_id, request.country, request.purpose, final_text)
            except Exception as e:
                print(f"[GRAPH WARNING] Could not save briefing to cache: {str(e)}")
            # ==========================================

        return StreamingResponse(stream_generator(), media_type="application/x-ndjson")
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
 

# 1. UPDATED COMPARE ENDPOINT (Saves to AuraDB using Async Driver)
@router.post("/api/compare", response_model=dict)
async def compare_countries(request: CompareRequest, user_id: str = Depends(get_optional_user)):
    """Generates a side-by-side comparative analysis of two countries and SAVES to DB."""
    try:
        raw_intel = await gather_comparison_intelligence(
            countryA=request.countryA, countryB=request.countryB, purpose=request.purpose
        )

        structured_llm = llm.with_structured_output(ComparisonOutput) # type: ignore
        prompt = (
            f"GOAL: COMPARATIVE ANALYSIS.\n"
            f"Country A: {request.countryA}\nCountry B: {request.countryB}\n"
            f"Context / Purpose: {request.purpose}\nBasis of Comparison: {request.basis}\n\n"
            f"RAW DATA FOR A:\n{raw_intel['countryA_raw_data']}\n\n"
            f"RAW DATA FOR B:\n{raw_intel['countryB_raw_data']}\n\n"
            f"TASK: Analyze the data and provide a deep, point-by-point comparison based strictly on '{request.basis}'.\n"
            f"RULES: 1. No tables/markdown headers. 2. Output exactly two lists of strings. 3. Indices must match directly. 4. Minimum points to provide 5. 6. provide as many points as u need - but with more reasoning and more context."
        )

        result: ComparisonOutput = await structured_llm.ainvoke([HumanMessage(content=prompt)])

        # ==========================================
        # ASYNC SAVE TO NEO4J (AURADB)
        # ==========================================
        if user_id:
            try:
                query = """
                MERGE (u:User {user_id: $user_id})
                CREATE (c:Comparison {
                    id: randomUUID(),
                    countryA: $countryA,
                    countryB: $countryB,
                    purpose: $purpose,
                    basis: $basis,
                    dataA: $dataA,
                    dataB: $dataB,
                    timestamp: datetime()
                })
                MERGE (u)-[:PERFORMED_COMPARISON]->(c)
                """
                
                async with graph_db.driver.session() as session:
                    await session.run(
                        query, 
                        user_id=user_id,
                        countryA=request.countryA, countryB=request.countryB,
                        purpose=request.purpose, basis=request.basis,
                        dataA=result.countryA_intel, dataB=result.countryB_intel
                    )
                print("[DB] Comparison saved to AuraDB successfully!")
            except Exception as db_err:
                print(f"[DB ERROR] Failed to save comparison: {db_err}")
        

        return {
            "countryA": request.countryA, "countryB": request.countryB,
            "dataA": result.countryA_intel, "dataB": result.countryB_intel
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/tab")
async def generate_tab_briefing(request: Tabs, user_id: str = Depends(get_optional_user)):
    """Generates a deep-dive report on a specific tab/category."""
    try:
        prompt = (
            f"GOAL: TAB DEEP DIVE.\n"
            f"Target Country: {request.country}\n"
            f"Travel Purpose: {request.purpose}\n"
            f"Selected Tab: {request.tabName}\n"
            f"Task: Execute your tab information tool. Filter the massive data payload to extract "
            f"ONLY what is relevant to '{request.tabName}', viewed through the lens of '{request.purpose}'. "
            f"Provide a highly detailed, organized breakdown."
        )
        
        async def stream_generator():
            try:
                
                async for event in graph_agent.astream_events({"messages": [HumanMessage(content=prompt)]}, version="v2"):
                    if event.get("event") == "on_chat_model_stream":
                        
                        
                        chunk_obj = event.get("data", {}).get("chunk")
                        
                        if chunk_obj and hasattr(chunk_obj, "content"):
                            chunk = chunk_obj.content
                            
                            if isinstance(chunk, str) and chunk:
                                yield json.dumps({"type": "chunk", "text": chunk}) + "\n"
                            elif isinstance(chunk, list):
                                text_chunk = "".join([c.get("text", "") for c in chunk if isinstance(c, dict)])
                                if text_chunk:
                                    yield json.dumps({"type": "chunk", "text": text_chunk}) + "\n"
            except Exception as e:
                yield json.dumps({"type": "error", "text": f"\n\n[Error] {str(e)}"}) + "\n"

        return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/doubt")
async def answer_doubt(request: Doubt, user_id: str = Depends(get_optional_user)):
    """Answers a specific user doubt using live data and internal knowledge."""
    try:
        prompt = (
            f"GOAL: RESOLVE USER DOUBT.\n"
            f"Target Country: {request.country}\n"
            f"Travel Purpose: {request.purpose}\n"
            f"Current Context (Tab): {request.tabName}\n"
            f"User Doubt: {request.doubt}\n"
            f"Task: Execute your doubt resolution tool. Read the data, and answer the user's doubt directly, "
            f"intelligently, and accurately. If the APIs lack the specific answer, use your internal expertise to answer it."
        )
        
        async def stream_generator():
            try:
                
                async for event in graph_agent.astream_events({"messages": [HumanMessage(content=prompt)]}, version="v2"):
                    if event.get("event") == "on_chat_model_stream":
                        
                        
                        chunk_obj = event.get("data", {}).get("chunk")
                        
                        if chunk_obj and hasattr(chunk_obj, "content"):
                            chunk = chunk_obj.content
                            
                            if isinstance(chunk, str) and chunk:
                                yield json.dumps({"type": "chunk", "text": chunk}) + "\n"
                            elif isinstance(chunk, list):
                                text_chunk = "".join([c.get("text", "") for c in chunk if isinstance(c, dict)])
                                if text_chunk:
                                    yield json.dumps({"type": "chunk", "text": text_chunk}) + "\n"
            except Exception as e:
                yield json.dumps({"type": "error", "text": f"\n\n[Error] {str(e)}"}) + "\n"

        return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/compare-doubt")
async def answer_compare_doubt(request: CompareDoubt, user_id: str = Depends(get_optional_user)):
    """Answers a specific user doubt regarding the comparison of two countries."""
    try:
        prompt = (
            f"GOAL: RESOLVE COMPARATIVE DOUBT.\n"
            f"Country A: {request.countryA}\n"
            f"Country B: {request.countryB}\n"
            f"Context / Purpose: {request.purpose}\n"
            f"Basis of Comparison: {request.basis}\n"
            f"User Doubt: {request.doubt}\n\n"
            f"Task: Execute your comparative doubt resolution tool to fetch live data for both countries simultaneously. "
            f"Read the data, and act as an expert comparative analyst. Answer the user's specific doubt by comparing "
            f"both countries directly. Use your supreme internal knowledge to fill any gaps."
        )
        
        async def stream_generator():
            try:
                
                async for event in graph_agent.astream_events({"messages": [HumanMessage(content=prompt)]}, version="v2"):
                    if event.get("event") == "on_chat_model_stream":
                        chunk_obj = event.get("data", {}).get("chunk")
                        if chunk_obj and hasattr(chunk_obj, "content"):
                            chunk = chunk_obj.content
                            if isinstance(chunk, str) and chunk:
                                yield json.dumps({"type": "chunk", "text": chunk}) + "\n"
                            elif isinstance(chunk, list):
                                text_chunk = "".join([c.get("text", "") for c in chunk if isinstance(c, dict)])
                                if text_chunk:
                                    yield json.dumps({"type": "chunk", "text": text_chunk}) + "\n"
            except Exception as e:
                yield json.dumps({"type": "error", "text": f"\n\n[Error] {str(e)}"}) + "\n"

        return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/translate", response_model=dict)
async def translate_text(payload: TranslatePayload, user_id: str = Depends(get_optional_user)):
    """Hits the Sarvam Translate API to convert English to Indic languages (with Auto-Chunking)."""
    
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        print("[CRITICAL] SARVAM_API_KEY is missing from .env file!")
        return {"data": payload.text} 

    url = "https://api.sarvam.ai/translate"
    
    
    clean_text = payload.text.replace("**", "").replace("###", "").replace("##", "").replace("#", "")
    
    
    
    chunks = textwrap.wrap(clean_text, width=1800, break_long_words=False, break_on_hyphens=False)
    
    headers = {"api-subscription-key": api_key, "Content-Type": "application/json"}

    async def fetch_chunk(client, chunk_text):
        req_body = {
            "input": chunk_text,
            "source_language_code": "en-IN",
            "target_language_code": payload.target_lang,
            "speaker_gender": "Male",
            "mode": "formal",
            "model": "sarvam-translate:v1" 
        }
        try:
            resp = await client.post(url, json=req_body, headers=headers, timeout=20.0)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("translated_text", chunk_text)
            else:
                print(f"[SARVAM CHUNK ERROR] Status {resp.status_code}: {resp.text}")
                return chunk_text
        except Exception as e:
            print(f"[SARVAM CHUNK FATAL] {str(e)}")
            return chunk_text

    
    async with httpx.AsyncClient() as client:
        tasks = [fetch_chunk(client, chunk) for chunk in chunks]
        translated_chunks = await asyncio.gather(*tasks)
        
    
    final_translated_text = " ".join(translated_chunks)

    return {"data": final_translated_text}


@router.post("/api/audio", response_model=dict)
async def generate_audio(payload: TranslatePayload, user_id: str = Depends(get_optional_user)):
    """Hits Sarvam's Bulbul engine to convert Indic text into base64 spoken audio."""
    
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY is missing.")

    url = "https://api.sarvam.ai/text-to-speech"
    clean_text = payload.text.replace("**", "").replace("###", "").replace("##", "").replace("#", "")
    safe_text = clean_text[:450] 

    req_body = {
        "inputs": [safe_text],
        "target_language_code": payload.target_lang,
        "speaker": "shubh", 
        "pace": 1.0,
        "speech_sample_rate": 8000,
        "model": "bulbul:v3" 
    }
    
    headers = {"api-subscription-key": api_key, "Content-Type": "application/json"}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=req_body, headers=headers, timeout=30.0)
            if resp.status_code != 200:
                print(f"[SARVAM AUDIO ERROR] Status {resp.status_code}: {resp.text}")
                return {"audio_base64": ""}
            data = resp.json()
            return {"audio_base64": data.get("audios", [""])[0]}
    except Exception as e:
        print(f"[SARVAM AUDIO FATAL] {str(e)}")
        return {"audio_base64": ""}

# ==========================================
# HISTORY FETCH ROUTES
# ==========================================

@router.get("/api/history", response_model=dict)
async def get_user_history(user_id: str = Depends(get_optional_user)):
    """Fetches history using the token if available, or returns guest history."""
    try:
        records = await graph_db.get_user_search_history(user_id)
        return {"data": records}
    except Exception as e:
        return {"error": str(e)}

@router.get("/api/briefings/archive", response_model=dict)
async def get_briefing_archive(user_id: str = Depends(get_optional_user)):
    """Fetches archives using the token if available, or returns guest archives."""
    try:
        records = await graph_db.get_user_briefing_history(user_id)
        return {"data": records}
    except Exception as e:
        return {"error": str(e)}

@router.get("/api/briefings/global", response_model=dict)
async def get_global_briefings():
    """DEV ROUTE: Fetches all generated briefings from the global cache for testing."""
    try:
        records = await graph_db.get_all_global_briefings()
        return {"data": records}
    except Exception as e:
        return {"error": str(e)}
    
@router.get("/api/compare/history")
async def get_compare_history(user_id: str = Depends(get_optional_user)):
    """Fetches the user's past comparisons from AuraDB using the async driver."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        query = """
        MATCH (u:User {user_id: $user_id})-[:PERFORMED_COMPARISON]->(c:Comparison)
        RETURN c
        ORDER BY c.timestamp DESC
        """
        formatted_history = []
        
        # Async session execution
        async with graph_db.driver.session() as session:
            db_result = await session.run(query, user_id=user_id)
            
            # Using async for to safely iterate through the async cursor
            async for record in db_result:
                r = record["c"]
                formatted_history.append({
                    "countryA": r.get("countryA"),
                    "countryB": r.get("countryB"),
                    "purpose": r.get("purpose"),
                    "basis": r.get("basis"),
                    "dataA": list(r.get("dataA", [])),
                    "dataB": list(r.get("dataB", [])),
                    "timestamp": str(r.get("timestamp")), # Safe string cast for Neo4j datetime
                    "isCompare": True # Flag for React UI Sidebar
                })
                
        return {"status": "success", "data": formatted_history}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))