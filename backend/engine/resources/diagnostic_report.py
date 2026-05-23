"""DiagnosticReport resource endpoints"""
import logging
from flask import jsonify

from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


def get_patient_diagnostic_reports(patient_id: str):
    """Get diagnostic reports for a patient"""
    params = {"patient": patient_id}
    result = fhir_proxy.search_resources("DiagnosticReport", params)
    if not result:
        return jsonify({"error": "error", "message": "Failed to fetch diagnostic reports"}), 500
    return jsonify(result), 200


def get_diagnostic_report(report_id: str):
    """Get a specific diagnostic report"""
    result = fhir_proxy.get_resource("DiagnosticReport", report_id)
    if not result:
        return jsonify({"error": "not_found", "message": f"Diagnostic report {report_id} not found"}), 404
    return jsonify(result), 200
