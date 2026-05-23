"""Patient resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient(patient_id: str):
    """Get patient by ID"""
    result = fhir_proxy.get_resource("Patient", patient_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Patient {patient_id} not found"}), 404
    return jsonify(result), 200


def list_patients(page: int = 1, page_size: int = 20):
    """List patients with pagination"""
    offset = (page - 1) * page_size
    params = {"_count": page_size}
    
    result = fhir_proxy.search_resources("Patient", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch patients"}), 500
    
    return jsonify(result), 200


def search_patients(search_term: str, page: int = 1, page_size: int = 20):
    """Search patients by name or identifier"""
    params = {"name": search_term, "_count": page_size}
    
    result = fhir_proxy.search_resources("Patient", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to search patients"}), 500
    
    return jsonify(result), 200


def get_patient_summary(patient_id: str):
    """Get clinical summary for a patient"""
    summary = fhir_proxy.get_patient_summary(patient_id)
    if not summary:
        return jsonify({"error": "not_found", "message": f"Patient {patient_id} not found"}), 404
    
    return jsonify(summary), 200


def get_patient_bundle(patient_id: str):
    """Get complete FHIR bundle for a patient"""
    bundle = fhir_proxy.get_patient_bundle(patient_id)
    if not bundle:
        return jsonify({"error": "not_found", "message": f"Patient {patient_id} not found"}), 404
    
    return jsonify(bundle), 200
