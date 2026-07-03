from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends
from langchain_core.messages import HumanMessage, AIMessage
from typing import Any, cast

# Schemas
from app.schemas import JourneyData, JourneyQuestion
# AI Agents & DB
from app.JourneyAgent import boomer_agent
from app.database import graph_db

# Security
from app.security import get_optional_user

load_dotenv()

router = APIRouter()

# ==========================================
# JOURNEY PLANNER ROUTES
# ==========================================

@router.post("/api/journey/interact", response_model=dict)
def journey_interaction(schema: JourneyData):
    prompt = f"""
        Your name is Boomer, a Travel Companion. You will assist users in planning their trips based on the provided information. The user has provided the following details:
        - Name: {schema.name}
        - Role: {schema.role}
        - Age: {schema.age}
        - Country: {schema.country}
        - Origin City: {schema.origin_city}
        - Nationality: {schema.nationality}
        - Citizenship: {schema.citizenship}
        - Health Condition: {schema.health_condition}
        - Passport Expiry: {schema.passport_expiry}
        - Passport Blank Pages: {schema.passport_blank_pages}
        - Purpose: {schema.purpose}
        - Target Country: {schema.target_country}
        - Exact Destination: {schema.exact_destination}
        - Travel Duration: {schema.travel_duration}
        - Add-ons: {schema.add_ons}
        - Extra Info: {schema.extra_info}
        """


@router.post("/api/journey/question", response_model=dict)
def question(schema: JourneyQuestion):
    """Handles user questions and doubts for the Boomer Travel Concierge."""
    user_question = schema.question

@router.get("/api/journey/next_phase", response_model=dict)
def next_phase():
    """Handles the transition to the next phase of the journey by fetching the specific step data(text) from DB or memory(of agent)."""
    