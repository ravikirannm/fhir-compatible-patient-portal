import logging
import json
import requests
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode

from constants import FHIR_BASE_URL, CACHE_TTL_SECONDS

logger = logging.getLogger(__name__)

# Simple in-memory cache
_resource_cache = {}
_cache_timestamps = {}


class FHIRProxy:
    def __init__(self, base_url: str = FHIR_BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/fhir+json", "Content-Type": "application/fhir+json"})

    def _get_cache_key(self, resource_type: str, resource_id: str = None, params: dict = None) -> str:
        """Generate cache key"""
        key = f"{resource_type}"
        if resource_id:
            key += f":{resource_id}"
        if params:
            key += f":{json.dumps(params, sort_keys=True)}"
        return key

    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache entry is still valid"""
        import time

        if cache_key not in _cache_timestamps:
            return False
        return time.time() - _cache_timestamps[cache_key] < CACHE_TTL_SECONDS

    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Get value from cache if valid"""
        if self._is_cache_valid(cache_key):
            return _resource_cache.get(cache_key)
        return None

    def _set_cache(self, cache_key: str, value: Dict):
        """Set value in cache"""
        import time

        _resource_cache[cache_key] = value
        _cache_timestamps[cache_key] = time.time()

    def get_resource(self, resource_type: str, resource_id: str) -> Optional[Dict]:
        """Get a single FHIR resource by ID"""
        cache_key = self._get_cache_key(resource_type, resource_id)
        cached = self._get_from_cache(cache_key)
        if cached:
            logger.debug(f"Cache hit for {resource_type}/{resource_id}")
            return cached

        try:
            url = f"{self.base_url}/{resource_type}/{resource_id}"
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            self._set_cache(cache_key, data)
            return data
        except requests.RequestException as e:
            logger.error(f"Error fetching {resource_type}/{resource_id}: {e}")
            return None

    def search_resources(self, resource_type: str, params: Dict[str, str]) -> Optional[Dict]:
        """Search for FHIR resources"""
        cache_key = self._get_cache_key(resource_type, params=params)
        cached = self._get_from_cache(cache_key)
        if cached:
            logger.debug(f"Cache hit for {resource_type} search")
            return cached

        try:
            url = f"{self.base_url}/{resource_type}"
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            self._set_cache(cache_key, data)
            return data
        except requests.RequestException as e:
            logger.error(f"Error searching {resource_type}: {e}")
            return None

    def get_patient_bundle(self, patient_id: str) -> Optional[Dict]:
        """Get complete FHIR bundle for a patient"""
        # This fetches the patient's data across all resource types
        try:
            url = f"{self.base_url}/Patient/{patient_id}"
            response = self.session.get(url)
            response.raise_for_status()
            patient = response.json()

            # Create a Bundle containing patient and related resources
            bundle = {
                "resourceType": "Bundle",
                "type": "searchset",
                "total": 0,
                "entry": [{"resource": patient}],
            }

            # Fetch related resources for this patient
            resource_types = [
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

            for resource_type in resource_types:
                search_result = self.search_resources(resource_type, {"patient": patient_id})
                if search_result and "entry" in search_result:
                    bundle["entry"].extend(search_result["entry"])
                    bundle["total"] += len(search_result.get("entry", []))

            return bundle
        except requests.RequestException as e:
            logger.error(f"Error fetching patient bundle for {patient_id}: {e}")
            return None

    def get_patient_summary(self, patient_id: str) -> Optional[Dict]:
        """Get aggregated clinical summary for a patient"""
        try:
            patient = self.get_resource("Patient", patient_id)
            if not patient:
                return None

            summary = {
                "patient_id": patient_id,
                "name": self._extract_patient_name(patient),
                "birthDate": patient.get("birthDate", ""),
                "gender": patient.get("gender", ""),
                "active_conditions": self._count_resources("Condition", {"patient": patient_id}),
                "current_medications": self._count_resources("MedicationRequest", {"patient": patient_id, "status": "active"}),
                "recent_observations": self._count_resources("Observation", {"patient": patient_id}),
                "allergies": self._count_resources("AllergyIntolerance", {"patient": patient_id}),
                "immunizations": self._count_resources("Immunization", {"patient": patient_id}),
            }
            return summary
        except Exception as e:
            logger.error(f"Error getting patient summary: {e}")
            return None

    def _extract_patient_name(self, patient: Dict) -> str:
        """Extract patient name from FHIR Patient resource"""
        names = patient.get("name", [])
        if names:
            name = names[0]
            given = " ".join(name.get("given", []))
            family = name.get("family", "")
            return f"{given} {family}".strip()
        return "Unknown"

    def _count_resources(self, resource_type: str, params: Dict[str, str]) -> int:
        """Count resources matching criteria"""
        result = self.search_resources(resource_type, params)
        if result:
            return result.get("total", 0)
        return 0

    def clear_cache(self):
        """Clear the cache"""
        global _resource_cache, _cache_timestamps
        _resource_cache.clear()
        _cache_timestamps.clear()
        logger.info("FHIR proxy cache cleared")


# Global FHIR proxy instance
fhir_proxy = FHIRProxy()
