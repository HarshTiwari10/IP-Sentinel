from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from app.routes.auth_routes import auth_bp
from app.routes.dashboard_routes import dashboard_bp


def create_app():

    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    CORS(app, origins=[
    "http://localhost:5173",
    "https://ip-sentinel-1.onrender.com"
    ])

    # SECRET KEY
    app.config["SECRET_KEY"] = "your-super-secret-key-change-this"

    # REGISTER BLUEPRINTS (🔥 IMPORTANT)
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

    @app.route("/ping")
    def ping():
        return {"status": "alive"}, 200

    @app.route("/")
    def home():
        return {"message": "Backend Running Successfully"}

    return app