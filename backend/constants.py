import os
from dotenv import load_dotenv

load_dotenv()

# Flask
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-in-production")
FLASK_ENV = os.getenv("FLASK_ENV", "development")

# HAPI FHIR
FHIR_BASE_URL = os.getenv("FHIR_BASE_URL", "http://localhost:8080/fhir")
FHIR_VERSION = os.getenv("FHIR_VERSION", "R4")

# Ollama
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

# Database
SQLITE_PATH = os.getenv("SQLITE_PATH", "./data/users.db")

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")

# JWT Configuration
JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))  # 1 hour
JWT_ALGORITHM = "HS256"

# Cache TTL
CACHE_TTL_SECONDS = 300  # 5 minutes

# FHIR Resources Supported
SUPPORTED_RESOURCES = [
    "Patient",
    "Encounter",
    "Observation",
    "Condition",
    "Procedure",
    "AllergyIntolerance",
    "Immunization",
    "MedicationRequest",
    "MedicationAdministration",
    "DiagnosticReport",
    "DocumentReference",
]

# FHIR Search Parameter Validation Rules
FHIR_SEARCH_PARAMS = {
    "Patient": ["_id", "name", "birthdate", "gender", "address", "identifier"],
    "Encounter": ["_id", "patient", "status", "type", "date", "practitioner"],
    "Observation": ["_id", "patient", "code", "status", "date", "category"],
    "Condition": ["_id", "patient", "code", "clinical-status", "onset-date"],
    "Procedure": ["_id", "patient", "code", "date", "status"],
    "AllergyIntolerance": ["_id", "patient", "code", "clinical-status"],
    "Immunization": ["_id", "patient", "vaccine-code", "date", "status"],
    "MedicationRequest": ["_id", "patient", "medication", "status", "intent"],
    "MedicationAdministration": ["_id", "patient", "medication", "status", "effective-time"],
    "DiagnosticReport": ["_id", "patient", "code", "date", "status"],
    "DocumentReference": ["_id", "patient", "type", "date", "status"],
}

# Pagination defaults
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
