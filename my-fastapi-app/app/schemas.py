from pydantic import BaseModel, Field

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