import logging
from typing import Dict, List, Tuple

from constants import FHIR_SEARCH_PARAMS, SUPPORTED_RESOURCES

logger = logging.getLogger(__name__)


class FHIRValidator:
    """Validates FHIR search parameters and resource types"""

    @staticmethod
    def validate_resource_type(resource_type: str) -> Tuple[bool, str]:
        """
        Validate FHIR resource type

        Returns: (is_valid, error_message)
        """
        if not resource_type:
            return False, "Resource type is required"

        if resource_type not in SUPPORTED_RESOURCES:
            return False, f"Resource type '{resource_type}' is not supported. Supported types: {', '.join(SUPPORTED_RESOURCES)}"

        return True, ""

    @staticmethod
    def validate_search_params(resource_type: str, params: Dict[str, str]) -> Tuple[bool, List[str]]:
        """
        Validate FHIR search parameters for a resource type

        Returns: (is_valid, list_of_invalid_params)
        """
        is_valid, error = FHIRValidator.validate_resource_type(resource_type)
        if not is_valid:
            return False, [error]

        allowed_params = FHIR_SEARCH_PARAMS.get(resource_type, [])
        invalid_params = []

        for param_name in params.keys():
            # Skip special FHIR parameters
            if param_name.startswith("_"):
                if param_name in ["_id", "_lastUpdated", "_tag", "_profile", "_security", "_text", "_content", "_count", "_sort"]:
                    continue
            elif param_name not in allowed_params:
                invalid_params.append(param_name)

        if invalid_params:
            return False, invalid_params

        return True, []

    @staticmethod
    def validate_nl_query_output(query_output: Dict) -> Tuple[bool, str]:
        """
        Validate LLM output for NL query

        Expected structure:
        {
            "resource_type": "Patient",
            "search_params": {"name": "john", "birthdate": ">1960-01-01"},
            "human_summary": "Searching for patients named John born after 1960"
        }
        """
        if not isinstance(query_output, dict):
            return False, "Output must be a dictionary"

        required_fields = ["resource_type", "search_params", "human_summary"]
        for field in required_fields:
            if field not in query_output:
                return False, f"Missing required field: {field}"

        # Validate resource type
        is_valid, error = FHIRValidator.validate_resource_type(query_output.get("resource_type"))
        if not is_valid:
            return False, error

        # Validate search params
        search_params = query_output.get("search_params")
        if not isinstance(search_params, dict):
            return False, "search_params must be a dictionary"

        is_valid, invalid_params = FHIRValidator.validate_search_params(
            query_output.get("resource_type"), search_params
        )
        if not is_valid:
            return False, f"Invalid search parameters: {', '.join(invalid_params)}"

        return True, ""


# Global validator instance
validator = FHIRValidator()
