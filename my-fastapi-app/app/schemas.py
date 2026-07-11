from pydantic import BaseModel, Field
from typing import Optional, Any, List, Dict

class SidebarRequest(BaseModel):
    country: str = Field(..., description="The name of the target country")
    purpose: str = Field(..., description="The user's purpose of visit (e.g., tourism, business, study)")

class CompareRequest(BaseModel):
    countryA: str
    countryB: str
    purpose: str
    basis: str

# 2. Strict output structure for the LLM to follow
class ComparisonOutput(BaseModel):
    countryA_intel: List[str] = Field(
        description="A list of robust text points for Country A. Each index must directly correspond/compare to the same index in countryB_intel."
    )
    countryB_intel: List[str] = Field(
        description="A list of robust text points for Country B. Each index must directly correspond/compare to the same index in countryA_intel."
    )

class Tabs(SidebarRequest):
    tabName: str = Field(..., description="The specific category or tab selected (e.g., economy, culture)")

class CompareDoubt(BaseModel):
    countryA: str
    countryB: str
    purpose: str
    basis: str
    doubt: str

class Doubt(Tabs):
    doubt: str = Field(..., description="The specific question or doubt the user has")

class TranslatePayload(BaseModel):
    text: str
    target_lang: str


class JourneyData(BaseModel):
    # Identity (fetched from DB)
    name: str 
    gender: str = "Male"
    role: str
    age: int
    country: str
    origin_city: str
    nationality: str
    citizenship: str
    bio: Optional[str]

    # Health & Documents (fetched from DB)
    health_condition: Optional[str]
    passport_expiry: Optional[str]
    passport_blank_pages: Optional[int]

    # Travel Details (fetched from frontend)
    target_country: str
    purpose: str 

    # Details user provides extra
    exact_destination: str 
    travel_duration: str
    add_ons: str 
    extra_info: Optional[str]
    
    # Session ID for LangGraph Memory (crucial for linking doubts to the same plan)
    session_id: str = Field(default_factory=lambda: "default_session")

class JourneyQuestion(BaseModel):
    session_id: str
    question: str
    current_step: str

class JourneySaveRequest(BaseModel):
    session_id: str
    target_country: str
    purpose: str
    journey_plan: Dict[str, Any]  # Matches what the React frontend sends
    chat_history: list = []

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    
    # Detailed Info
    role: str
    age: int
    country: str
    origin_city: str
    nationality: str
    citizenship: str
    bio: Optional[str] = ""
    
    # Health & Documents
    health_condition: Optional[str] = ""
    passport_expiry: Optional[str] = ""
    passport_blank_pages: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class PasswordVerify(BaseModel):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    origin_city: Optional[str] = None
    nationality: Optional[str] = None
    citizenship: Optional[str] = None
    health_condition: Optional[str] = None
    passport_expiry: Optional[str] = None
    passport_blank_pages: Optional[int] = None
    