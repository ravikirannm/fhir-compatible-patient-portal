"""Condition resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_conditions(patient_id: str):
    """Get conditions for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("Condition", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch conditions"}), 500
    return jsonify(result), 200


def get_condition(condition_id: str):
    """Get a specific condition"""
    result = fhir_proxy.get_resource("Condition", condition_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Condition {condition_id} not found"}), 404
    return jsonify(result), 200
