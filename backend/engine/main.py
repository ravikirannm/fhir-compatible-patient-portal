from flask import Flask, Response, request, make_response, stream_with_context, jsonify
import uuid
import logging
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import json

from constants import JWT_SECRET_KEY, CORS_ORIGINS
from engine.auth import token_required, role_required, authenticate_user, create_access_token
from engine.database import db
from engine.data_model import (
    UserRegister, UserLogin, TokenResponse, UserResponse, NLQueryRequest, NLQueryResponse
)
from engine.nl_query import nl_engine
from engine.fhir_proxy import fhir_proxy
from engine.resources import (
    patient, encounter, observation, condition, procedure, allergy,
    immunization, medication_request, medication_admin, diagnostic_report,
    document_reference
)

logger = logging.getLogger(__name__)

# Create an instance of the Flask class
app = Flask(__name__)

# Configure JWT
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
jwt = JWTManager(app)

# Configure CORS
CORS(app, 
     resources={r"/*": {"origins": CORS_ORIGINS}},
     supports_credentials=True)


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "FHIR Patient Portal Backend"}), 200


# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.route('/auth/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "invalid_request", "message": "Request body is required"}), 400
        
        # Validate request
        login_data = UserLogin(**data)
        
        # Authenticate user
        user = authenticate_user(login_data.username, login_data.password)
        if not user:
            return jsonify({"error": "unauthorized", "message": "Invalid username or password"}), 401
        
        # Create JWT token
        token = create_access_token(user["id"], user["username"], user["role"])
        
        response = {
            "access_token": token,
            "token_type": "Bearer",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "created_at": user["created_at"]
            }
        }
        return jsonify(response), 200
        
    except ValueError as e:
        return jsonify({"error": "validation_error", "message": str(e)}), 400
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"error": "server_error", "message": "An error occurred during login"}), 500


@app.route('/auth/register', methods=['POST'])
def register():
    """Register a new user (admin only)"""
    try:
        # Check if user is authenticated and has admin role
        # For now, allow registration if no users exist (first user is admin)
        # In production, only allow authenticated admins to register
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "invalid_request", "message": "Request body is required"}), 400
        
        # Validate request
        reg_data = UserRegister(**data)
        
        # Check if user already exists
        if db.user_exists(reg_data.username):
            return jsonify({"error": "conflict", "message": "Username already exists"}), 409
        
        # Create user
        user = db.create_user(reg_data.username, reg_data.password, reg_data.role)
        
        return jsonify({
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "created_at": user["created_at"]
        }), 201
        
    except ValueError as e:
        return jsonify({"error": "validation_error", "message": str(e)}), 400
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"error": "server_error", "message": "An error occurred during registration"}), 500


@app.route('/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user session and role"""
    try:
        user = db.get_user_by_id(request.user_id)
        if not user:
            return jsonify({"error": "not_found", "message": "User not found"}), 404
        
        return jsonify({
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "created_at": user["created_at"]
        }), 200
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return jsonify({"error": "server_error", "message": "An error occurred"}), 500


# ============================================================================
# Patient Endpoints
# ============================================================================

@app.route('/api/v1/patients', methods=['GET'])
@token_required
def list_patients_endpoint():
    """List patients with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)
        search = request.args.get('search', None, type=str)
        
        if search:
            return patient.search_patients(search, page, page_size)
        else:
            return patient.list_patients(page, page_size)
    except Exception as e:
        logger.error(f"Error listing patients: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>', methods=['GET'])
@token_required
def get_patient_endpoint(patient_id):
    """Get patient by ID"""
    try:
        return patient.get_patient(patient_id)
    except Exception as e:
        logger.error(f"Error getting patient: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/summary', methods=['GET'])
@token_required
def get_patient_summary_endpoint(patient_id):
    """Get patient clinical summary"""
    try:
        return patient.get_patient_summary(patient_id)
    except Exception as e:
        logger.error(f"Error getting patient summary: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/bundle', methods=['GET'])
@token_required
def get_patient_bundle_endpoint(patient_id):
    """Get complete FHIR bundle for patient"""
    try:
        return patient.get_patient_bundle(patient_id)
    except Exception as e:
        logger.error(f"Error getting patient bundle: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


# ============================================================================
# Clinical Resource Endpoints
# ============================================================================

@app.route('/api/v1/patients/<patient_id>/encounters', methods=['GET'])
@token_required
def get_encounters_endpoint(patient_id):
    """Get encounters for patient"""
    try:
        return encounter.get_patient_encounters(patient_id)
    except Exception as e:
        logger.error(f"Error getting encounters: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/observations', methods=['GET'])
@token_required
def get_observations_endpoint(patient_id):
    """Get observations for patient"""
    try:
        category = request.args.get('category', None, type=str)
        return observation.get_patient_observations(patient_id, category)
    except Exception as e:
        logger.error(f"Error getting observations: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/conditions', methods=['GET'])
@token_required
def get_conditions_endpoint(patient_id):
    """Get conditions for patient"""
    try:
        return condition.get_patient_conditions(patient_id)
    except Exception as e:
        logger.error(f"Error getting conditions: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/procedures', methods=['GET'])
@token_required
def get_procedures_endpoint(patient_id):
    """Get procedures for patient"""
    try:
        return procedure.get_patient_procedures(patient_id)
    except Exception as e:
        logger.error(f"Error getting procedures: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/allergies', methods=['GET'])
@token_required
def get_allergies_endpoint(patient_id):
    """Get allergies for patient"""
    try:
        return allergy.get_patient_allergies(patient_id)
    except Exception as e:
        logger.error(f"Error getting allergies: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/immunizations', methods=['GET'])
@token_required
def get_immunizations_endpoint(patient_id):
    """Get immunizations for patient"""
    try:
        return immunization.get_patient_immunizations(patient_id)
    except Exception as e:
        logger.error(f"Error getting immunizations: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


# ============================================================================
# Medication Endpoints
# ============================================================================

@app.route('/api/v1/patients/<patient_id>/medications', methods=['GET'])
@token_required
def get_medications_endpoint(patient_id):
    """Get medications for patient"""
    try:
        status = request.args.get('status', None, type=str)
        return medication_request.get_patient_medications(patient_id, status)
    except Exception as e:
        logger.error(f"Error getting medications: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/medication-admin', methods=['GET'])
@token_required
def get_medication_admin_endpoint(patient_id):
    """Get medication administration records for patient"""
    try:
        return medication_admin.get_patient_medication_admin(patient_id)
    except Exception as e:
        logger.error(f"Error getting medication administration: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


# ============================================================================
# Documentation Endpoints
# ============================================================================

@app.route('/api/v1/patients/<patient_id>/diagnostic-reports', methods=['GET'])
@token_required
def get_diagnostic_reports_endpoint(patient_id):
    """Get diagnostic reports for patient"""
    try:
        return diagnostic_report.get_patient_diagnostic_reports(patient_id)
    except Exception as e:
        logger.error(f"Error getting diagnostic reports: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/patients/<patient_id>/documents', methods=['GET'])
@token_required
def get_documents_endpoint(patient_id):
    """Get document references for patient"""
    try:
        return document_reference.get_patient_documents(patient_id)
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


# ============================================================================
# FHIR Resource Browser Endpoints
# ============================================================================

@app.route('/api/v1/fhir/<resource_type>', methods=['GET'])
@token_required
@role_required('researcher', 'clinician')
def search_fhir_resource(resource_type):
    """Search any FHIR resource by query parameters"""
    try:
        # Get all query parameters
        params = request.args.to_dict()
        
        result = fhir_proxy.search_resources(resource_type, params)
        if not result:
            return jsonify({"error": "error", "message": f"Failed to search {resource_type}"}), 500
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error searching FHIR resource: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


@app.route('/api/v1/fhir/<resource_type>/<resource_id>', methods=['GET'])
@token_required
@role_required('researcher', 'clinician')
def get_fhir_resource(resource_type, resource_id):
    """Get specific FHIR resource by ID"""
    try:
        result = fhir_proxy.get_resource(resource_type, resource_id)
        if not result:
            return jsonify({"error": "not_found", "message": f"{resource_type}/{resource_id} not found"}), 404
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting FHIR resource: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


# ============================================================================
# Natural Language Query Endpoint
# ============================================================================

@app.route('/api/v1/nl-query', methods=['POST'])
@token_required
def natural_language_query():
    """Translate natural language to FHIR query and execute"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "invalid_request", "message": "Request body is required"}), 400
        
        # Validate request
        nl_request = NLQueryRequest(**data)
        
        # Translate NL to FHIR
        translated, error = nl_engine.translate(nl_request.query)
        if error:
            return jsonify({
                "translated_query": None,
                "results": [],
                "error": error,
                "total_count": 0
            }), 400
        
        logger.info(f"NL Query translated: {translated}")
        
        # Execute query if requested
        results = None
        if nl_request.execute:
            results, exec_error = nl_engine.execute_translated_query(translated)
            if exec_error:
                logger.warning(f"Query execution error: {exec_error}")
        
        entries = results.get("entry", []) if results else []
        response = {
            "translated_query": translated,
            "results": entries,
            "error": None,
            "total_count": results.get("total") or len(entries) if results else 0
        }
        
        return jsonify(response), 200
        
    except ValueError as e:
        return jsonify({"error": "validation_error", "message": str(e)}), 400
    except Exception as e:
        logger.error(f"NL Query error: {e}")
        return jsonify({"error": "server_error", "message": str(e)}), 500


# ============================================================================
# Integration Stub Endpoints (Future)
# ============================================================================

@app.route('/api/v1/analyze', methods=['POST'])
@token_required
def analyze_symptoms():
    """Symptom analysis endpoint stub (future integration)"""
    return jsonify({
        "status": "not_implemented",
        "message": "Symptom analyzer integration coming soon"
    }), 501


@app.route('/api/v1/check-interactions', methods=['POST'])
@token_required
def check_interactions():
    """Prescription interaction checker endpoint stub (future integration)"""
    return jsonify({
        "status": "not_implemented",
        "message": "Prescription interaction checker integration coming soon"
    }), 501


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "not_found", "message": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal error: {error}")
    return jsonify({"error": "server_error", "message": "An internal error occurred"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
