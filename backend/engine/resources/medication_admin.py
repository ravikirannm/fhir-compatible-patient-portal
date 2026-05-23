"""MedicationAdministration resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_medication_admin(patient_id: str):
    """Get medication administration records for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("MedicationAdministration", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch medication administration records"}), 500
    return jsonify(result), 200


def get_medication_admin(admin_id: str):
    """Get a specific medication administration record"""
    result = fhir_proxy.get_resource("MedicationAdministration", admin_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Medication administration {admin_id} not found"}), 404
    return jsonify(result), 200
