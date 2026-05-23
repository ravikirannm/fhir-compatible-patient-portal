"""DocumentReference resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_documents(patient_id: str):
    """Get document references for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("DocumentReference", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch documents"}), 500
    return jsonify(result), 200


def get_document(document_id: str):
    """Get a specific document reference"""
    result = fhir_proxy.get_resource("DocumentReference", document_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Document {document_id} not found"}), 404
    return jsonify(result), 200
