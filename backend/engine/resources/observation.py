"""Observation resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_observations(patient_id: str, category: str = None):
    """Get observations for a patient, optionally filtered by category"""
    params = {"patient": patient_id}
    if category:
        params["category"] = category
    
    result = fhir_proxy.search_resources("Observation", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch observations"}), 500
    return jsonify(result), 200


def get_observation(observation_id: str):
    """Get a specific observation"""
    result = fhir_proxy.get_resource("Observation", observation_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Observation {observation_id} not found"}), 404
    return jsonify(result), 200
