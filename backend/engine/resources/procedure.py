"""Procedure resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_procedures(patient_id: str):
    """Get procedures for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("Procedure", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch procedures"}), 500
    return jsonify(result), 200


def get_procedure(procedure_id: str):
    """Get a specific procedure"""
    result = fhir_proxy.get_resource("Procedure", procedure_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Procedure {procedure_id} not found"}), 404
    return jsonify(result), 200
