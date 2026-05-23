"""AllergyIntolerance resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_allergies(patient_id: str):
    """Get allergies for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("AllergyIntolerance", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch allergies"}), 500
    return jsonify(result), 200


def get_allergy(allergy_id: str):
    """Get a specific allergy"""
    result = fhir_proxy.get_resource("AllergyIntolerance", allergy_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Allergy {allergy_id} not found"}), 404
    return jsonify(result), 200
