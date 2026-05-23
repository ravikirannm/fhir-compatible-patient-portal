from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Authentication Models
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: str = Field(default="clinician", pattern="^(clinician|researcher)$")


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: UserResponse


# NL Query Models
class NLQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    execute: bool = Field(default=True)


class FHIRSearchParams(BaseModel):
    resource_type: str
    search_params: Dict[str, str]
    human_summary: str


class NLQueryResponse(BaseModel):
    translated_query: FHIRSearchParams
    results: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    total_count: int = 0


# Patient Summary Models
class PatientSummaryResponse(BaseModel):
    patient_id: str
    name: str
    birthDate: str
    gender: str
    active_conditions: int
    current_medications: int
    recent_observations: int
    allergies: int
    immunizations: int


class PatientBundleResponse(BaseModel):
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: List[Dict[str, Any]] = Field(default_factory=list)


# FHIR Resource Models (generic wrapper)
class FHIRResourceResponse(BaseModel):
    resourceType: str
    id: str
    meta: Optional[Dict[str, Any]] = None
    data: Dict[str, Any]


class FHIRSearchResponse(BaseModel):
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: List[Dict[str, Any]] = Field(default_factory=list)
    link: Optional[List[Dict[str, str]]] = None


# Error Response
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None


# Medication Integration Models (for prescription checker integration seam)
class MedicationIntegrationResponse(BaseModel):
    patient_id: str
    medications: List[Dict[str, Any]] = Field(default_factory=list)
    bundle: Optional[Dict[str, Any]] = None


# Future Integration Stubs
class AnalysisRequest(BaseModel):
    patient_id: str
    data: Dict[str, Any]


class AnalysisResponse(BaseModel):
    status: str = "not_implemented"
    message: str = "Symptom analyzer integration coming soon"


class InteractionCheckRequest(BaseModel):
    medications: List[Dict[str, Any]]


class InteractionCheckResponse(BaseModel):
    status: str = "not_implemented"
    message: str = "Prescription interaction checker integration coming soon"
