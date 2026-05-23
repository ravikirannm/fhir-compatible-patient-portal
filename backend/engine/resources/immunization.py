"""Immunization resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_immunizations(patient_id: str):
    """Get immunizations for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("Immunization", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch immunizations"}), 500
    return jsonify(result), 200


def get_immunization(immunization_id: str):
    """Get a specific immunization"""
    result = fhir_proxy.get_resource("Immunization", immunization_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Immunization {immunization_id} not found"}), 404
    return jsonify(result), 200
