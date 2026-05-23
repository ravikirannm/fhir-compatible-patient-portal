"""
Few-shot prompts for FHIR NL-to-Query translation using Qwen2.5:7b
"""

SYSTEM_PROMPT = """You are an expert in HL7 FHIR R4 (Fast Healthcare Interoperability Resources).
Your task is to translate natural language clinical queries into structured FHIR search parameters.

You have access to the following FHIR resource types:
- Patient: Demographics, identifiers, contact information
- Encounter: Hospital visits, appointments, emergency events
- Observation: Vital signs (BP, weight, temperature), lab results
- Condition: Medical diagnoses (Type 2 Diabetes, Hypertension)
- Procedure: Surgeries, physical therapy, interventions
- AllergyIntolerance: Allergies and intolerances to substances
- Immunization: Vaccine administration records
- MedicationRequest: Prescriptions written by clinicians
- MedicationAdministration: Confirmed medication administration records
- DiagnosticReport: Final reports from labs or imaging centers
- DocumentReference: Pointers to external files and documents

Always respond with a valid JSON object containing:
{
    "resource_type": "ResourceType",
    "search_params": {
        "param1": "value1",
        "param2": "value2"
    },
    "human_summary": "Brief explanation of the query"
}

Do not include any markdown formatting or code blocks. Output ONLY valid JSON.
"""

FEW_SHOT_EXAMPLES = [
    {
        "query": "Show me all diabetic patients over 60 years old",
        "response": {
            "resource_type": "Patient",
            "search_params": {
                "birthdate": "<1964-01-01"
            },
            "human_summary": "Searching for patients born before 1964 (over 60 years old) with diabetes diagnosis"
        },
        "explanation": "First search for patients by age, then filter results by diabetes conditions"
    },
    {
        "query": "Find patients with hypertension and currently on beta-blockers",
        "response": {
            "resource_type": "Condition",
            "search_params": {
                "code": "http://snomed.info/sct|38341003"  # Hypertension SNOMED code
            },
            "human_summary": "Searching for active hypertension conditions; prescriptions will be cross-referenced for beta-blockers"
        },
        "explanation": "Search for conditions matching hypertension, then correlate with medications"
    },
    {
        "query": "What are the recent vital signs for patient John Smith",
        "response": {
            "resource_type": "Observation",
            "search_params": {
                "category": "vital-signs",
                "status": "final"
            },
            "human_summary": "Fetching recent vital sign observations (blood pressure, temperature, weight, etc.)"
        },
        "explanation": "Search for vital sign observations with final status to get confirmed values"
    },
    {
        "query": "Show me patients with severe penicillin allergies",
        "response": {
            "resource_type": "AllergyIntolerance",
            "search_params": {
                "code": "http://snomed.info/sct|91143003",  # Penicillin SNOMED code
                "clinical-status": "active"
            },
            "human_summary": "Searching for active penicillin allergies with severe reaction risk"
        },
        "explanation": "Search for documented penicillin allergies that are currently active"
    },
    {
        "query": "List all lab results from the past month",
        "response": {
            "resource_type": "Observation",
            "search_params": {
                "category": "laboratory",
                "date": ">=2024-04-22"
            },
            "human_summary": "Searching for laboratory observations (test results) from the past month"
        },
        "explanation": "Filter observations by laboratory category and recent date"
    },
    {
        "query": "Find encounters where the patient was admitted to ICU",
        "response": {
            "resource_type": "Encounter",
            "search_params": {
                "location": "ICU"
            },
            "human_summary": "Searching for encounters involving ICU (intensive care unit) location"
        },
        "explanation": "Search encounters by location parameter for ICU stays"
    },
    {
        "query": "Show immunization history for patients over 65",
        "response": {
            "resource_type": "Immunization",
            "search_params": {
                "status": "completed"
            },
            "human_summary": "Fetching completed immunization records for elderly patients"
        },
        "explanation": "Search for completed immunizations, age filtering done in post-processing"
    },
    {
        "query": "What medications are currently prescribed?",
        "response": {
            "resource_type": "MedicationRequest",
            "search_params": {
                "status": "active",
                "intent": "order"
            },
            "human_summary": "Searching for active medication prescriptions (orders)"
        },
        "explanation": "Filter MedicationRequest by active status and order intent"
    }
]


def get_system_prompt() -> str:
    """Get the system prompt for NL-to-FHIR translation"""
    return SYSTEM_PROMPT


def get_user_prompt(natural_language_query: str) -> str:
    """Build the user prompt with few-shot examples"""
    examples_text = ""
    for i, example in enumerate(FEW_SHOT_EXAMPLES, 1):
        examples_text += f"\nExample {i}:\n"
        examples_text += f"Query: {example['query']}\n"
        examples_text += f"Response:\n{example['response']}\n"

    prompt = f"""{examples_text}

Now, translate this natural language query to FHIR search parameters:

Query: {natural_language_query}

Response (JSON only, no markdown):"""

    return prompt


def create_prompt(natural_language_query: str) -> str:
    """
    Create the full prompt for the LLM

    Args:
        natural_language_query: The user's natural language clinical query

    Returns:
        The complete prompt to send to the LLM
    """
    system = get_system_prompt()
    user = get_user_prompt(natural_language_query)
    return f"{system}\n\n{user}"
