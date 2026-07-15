from dotenv import load_dotenv, find_dotenv



load_dotenv(find_dotenv(), override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager


from app.database import graph_db
from routers import Authentication, Phase_one, Phase_two

# -------------------------
# Lifecycle Context Manager
# -------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs right before the server starts accepting requests
    try:
        is_connected = await graph_db.verify_connection()
        if is_connected:
            print("\n[SUCCESS] Connected to Neo4j AuraDB.")
            await graph_db.seed_geopolitical_network()
            print("[SUCCESS] Graph Geopolitical Nodes seeded.")
        else:
            print("\n[WARNING] Neo4j AuraDB connection returned False.")
    except Exception as e:
        print(f"\n[CRITICAL ERROR] Graph DB connection failure: {str(e)}")
        
    yield # The server is now running and accepting API calls
    
    # This runs when you kill the server (Ctrl+C)
    await graph_db.close()
    print("\n[CLEANUP] Neo4j async pool drivers cleanly released.")

# -------------------------
# Application Setup
# -------------------------
app = FastAPI(title="Travel Intelligence API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "https://travel-atlas-intelligence.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(Authentication.router, prefix="", tags=["Authentication"])
app.include_router(Phase_one.router, prefix="", tags=["Phase-one"])
app.include_router(Phase_two.router, prefix="", tags=["Phase-two"])
