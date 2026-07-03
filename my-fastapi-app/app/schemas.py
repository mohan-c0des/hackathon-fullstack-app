from pydantic import BaseModel, Field
from typing import Optional

class SidebarRequest(BaseModel):
    country: str = Field(..., description="The name of the target country")
    purpose: str = Field(..., description="The user's purpose of visit (e.g., tourism, business, study)")

class Tabs(SidebarRequest):
    tabName: str = Field(..., description="The specific category or tab selected (e.g., economy, culture)")

class Doubt(Tabs):
    doubt: str = Field(..., description="The specific question or doubt the user has")

class TranslatePayload(BaseModel):
    text: str
    target_lang: str

class JourneyData(BaseModel):
    #identity(fetched from DB)
    name: str 
    role: str
    age: int
    country: str
    origin_city: str
    nationality: str
    citizenship: str
    bio: Optional[str] = ""

    # Health & Documents(fetched from DB)
    health_condition: Optional[str] = ""
    passport_expiry: Optional[str] = ""
    passport_blank_pages: Optional[int] = None

    # Travel Details(fetched from frontend)
    purpose: Optional[str] = None
    target_country: str

    #these are the only details that user will provide extra.
    exact_destination: str #->this is the exact state and city or place user wants to visit in the target country
    travel_duration: str
    add_ons: str #->this tells if user is travelling alone, one-way-trip, etc
    extra_info: Optional[str] = None

class JourneyQuestion(BaseModel):
    question: str


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
    