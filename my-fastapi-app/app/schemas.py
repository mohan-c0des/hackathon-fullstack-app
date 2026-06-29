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

class JourneyInteractPayload(BaseModel):
    user_id: str
    target_country: str
    action: str  # Options: "START", "CHAT", "NEXT_PHASE", "AIRPORT_ARRIVED", "DESTINATION_ARRIVED"
    message: Optional[str] = None
    
    # Profile Data (Only required when action == "START")
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    citizenship: Optional[str] = None
    age: Optional[int] = None
    purpose: Optional[str] = None

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
    