from flask import Flask
from flask_cors import CORS

from app.routes.auth_routes import auth_bp
from app.routes.dashboard_routes import dashboard_bp


def create_app():

    app = Flask(__name__)
    CORS(app, origins=[
    "http://localhost:5173",
    "https://ip-sentinel-frontend.onrender.com"
    ])

    # SECRET KEY
    app.config["SECRET_KEY"] = "your-super-secret-key-change-this"

    # REGISTER BLUEPRINTS (🔥 IMPORTANT)
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

    @app.route("/")
    def home():
        return {"message": "Backend Running Successfully"}

    return app