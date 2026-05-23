"""MedicationRequest resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_medications(patient_id: str, status: str = None):
    """Get medication requests for a patient"""
    params = {"patient": patient_id}
    if status:
        params["status"] = status
    
    result = fhir_proxy.search_resources("MedicationRequest", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch medications"}), 500
    return jsonify(result), 200


def get_medication_request(medication_id: str):
    """Get a specific medication request"""
    result = fhir_proxy.get_resource("MedicationRequest", medication_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Medication {medication_id} not found"}), 404
    return jsonify(result), 200
