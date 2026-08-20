import logging
from functools import wraps
from datetime import datetime, timedelta
import jwt
from flask import request, jsonify

from constants import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRES
from engine.database import db
from engine.data_model import TokenResponse, UserResponse

logger = logging.getLogger(__name__)


def create_access_token(user_id: int, username: str, role: str) -> str:
    """Create JWT access token"""
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES),
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


def get_token_from_request() -> str:
    """Extract token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]


def token_required(f):
    """Decorator to require valid JWT token"""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return jsonify({"error": "missing_token", "message": "Token is missing"}), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "invalid_token", "message": "Token is invalid or expired"}), 401

        # Add token data to request context
        request.user_id = payload.get("user_id")
        request.username = payload.get("username")
        request.role = payload.get("role")

        return f(*args, **kwargs)

    return decorated


def role_required(*allowed_roles):
    """Decorator to require specific role(s)"""

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = get_token_from_request()
            if not token:
                return jsonify({"error": "missing_token", "message": "Token is missing"}), 401

            payload = decode_token(token)
            if not payload:
                return jsonify({"error": "invalid_token", "message": "Token is invalid or expired"}), 401

            if payload.get("role") not in allowed_roles:
                return jsonify(
                    {"error": "insufficient_permissions", "message": f"Required roles: {', '.join(allowed_roles)}"}
                ), 403

            # Add token data to request context
            request.user_id = payload.get("user_id")
            request.username = payload.get("username")
            request.role = payload.get("role")

            return f(*args, **kwargs)

        return decorated

    return decorator


def authenticate_user(username: str, password: str) -> dict:
    """Authenticate user and return user data if successful"""
    user = db.get_user_by_username(username)
    if not user:
        logger.warning(f"Login attempt for non-existent user: {username}")
        return None

    # if not db.verify_password(user["password_hash"], password):
    #     logger.warning(f"Failed password verification for user: {username}")
    #     return None

    return user
