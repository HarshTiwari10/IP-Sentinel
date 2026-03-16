from functools import wraps
from flask import request, jsonify, current_app
import jwt

def token_required(required_role=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):

            auth_header = request.headers.get("Authorization")

            if not auth_header:
                return jsonify({"message": "Token is missing"}), 401

            try:
                token = auth_header.split(" ")[1]

                decoded = jwt.decode(
                    token,
                    current_app.config["SECRET_KEY"],
                    algorithms=["HS256"]
                )

            except jwt.ExpiredSignatureError:
                return jsonify({"message": "Token expired"}), 401

            except:
                return jsonify({"message": "Invalid token"}), 401

            # Role check (optional)
            if required_role and decoded["role"] != required_role:
                return jsonify({"message": "Unauthorized access"}), 403

            return f(*args, **kwargs)

        return wrapper
    return decorator