"""Encounter resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_encounters(patient_id: str):
    """Get encounters for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("Encounter", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch encounters"}), 500
    return jsonify(result), 200


def get_encounter(encounter_id: str):
    """Get a specific encounter"""
    result = fhir_proxy.get_resource("Encounter", encounter_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Encounter {encounter_id} not found"}), 404
    return jsonify(result), 200
