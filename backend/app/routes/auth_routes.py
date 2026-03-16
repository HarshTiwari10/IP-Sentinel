from flask import Blueprint, request, jsonify, current_app
from app.db import users_collection, ip_logs_collection, blacklist_collection, config_collection
from app.utils.auth_middleware import token_required
from datetime import datetime, timedelta
import bcrypt
import jwt

auth_bp = Blueprint("auth", __name__)


# ─── Helpers ───────────────────────────────────────────────────────────────────

def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    for key, val in list(doc.items()):
        if isinstance(val, datetime):
            doc[key] = val.strftime("%Y-%m-%d %H:%M:%S")
    return doc


def get_config():
    cfg = config_collection.find_one({"_id": "security_config"})
    if not cfg:
        return {"max_failed_attempts": 5, "block_duration_minutes": 30}
    return cfg


def check_and_auto_block(ip):
    """
    MAIN FEATURE — Core IP monitoring logic:
    Count failed attempts for this IP within the configured window.
    If count >= limit, automatically blacklist the IP.
    Returns True if the IP was just auto-blocked.
    """
    cfg = get_config()
    max_attempts = cfg.get("max_failed_attempts", 5)
    window_minutes = cfg.get("block_duration_minutes", 30)

    since = datetime.now() - timedelta(minutes=window_minutes)
    failed_count = ip_logs_collection.count_documents({
        "ip_address": ip,
        "status": "FAILED",
        "login_time": {"$gte": since}
    })

    if failed_count >= max_attempts:
        already = blacklist_collection.find_one({"ip_address": ip, "type": "blacklist"})
        if not already:
            blacklist_collection.delete_one({"ip_address": ip, "type": "whitelist"})
            blacklist_collection.insert_one({
                "ip_address": ip,
                "reason": f"Auto-blocked: {failed_count} failed attempts in {window_minutes} min",
                "blocked_at": datetime.now(),
                "expires": "Never",
                "type": "blacklist",
                "auto_blocked": True
            })
            return True
    return False


# ─── Auth ──────────────────────────────────────────────────────────────────────

@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    selected_role = data.get("role")
    client_ip = request.remote_addr

    # 1. Check blacklist first
    blacklisted = blacklist_collection.find_one({"ip_address": client_ip, "type": "blacklist"})
    if blacklisted:
        ip_logs_collection.insert_one({
            "username": username, "ip_address": client_ip,
            "login_time": datetime.now(), "status": "BLOCKED"
        })
        return jsonify({"message": "Your IP is blocked. Contact administrator."}), 403

    user = users_collection.find_one({"username": username})

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        # 2. Log failed attempt
        ip_logs_collection.insert_one({
            "username": username, "ip_address": client_ip,
            "login_time": datetime.now(), "status": "FAILED"
        })
        # 3. Auto-block check (MAIN FEATURE)
        auto_blocked = check_and_auto_block(client_ip)
        if auto_blocked:
            return jsonify({"message": "Too many failed attempts. Your IP has been blocked."}), 403

        cfg = get_config()
        since = datetime.now() - timedelta(minutes=cfg.get("block_duration_minutes", 30))
        fails = ip_logs_collection.count_documents({
            "ip_address": client_ip, "status": "FAILED", "login_time": {"$gte": since}
        })
        remaining = max(0, cfg.get("max_failed_attempts", 5) - fails)
        return jsonify({"message": f"Invalid credentials. {remaining} attempt(s) remaining before IP block."}), 401

    if selected_role == "ADMIN" and user["role"] != "ADMIN":
        return jsonify({"message": "Admin access denied"}), 403

    # 4. Log success
    ip_logs_collection.insert_one({
        "username": username, "ip_address": client_ip,
        "login_time": datetime.now(), "status": "SUCCESS"
    })

    token = jwt.encode(
        {"user_id": str(user["_id"]), "username": user["username"],
         "role": user["role"], "exp": datetime.now() + timedelta(hours=2)},
        current_app.config["SECRET_KEY"], algorithm="HS256"
    )
    return jsonify({"message": "Login successful", "role": user["role"], "token": token}), 200


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "USER")
    if users_collection.find_one({"username": username}):
        return jsonify({"message": "Username already exists"}), 400
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    users_collection.insert_one({"username": username, "password": hashed, "role": role})
    return jsonify({"message": "User registered successfully"}), 201


# ─── Admin: Metrics & Logs ─────────────────────────────────────────────────────

@auth_bp.route("/api/admin/dashboard", methods=["GET"])
@token_required(required_role="ADMIN")
def admin_dashboard():
    return jsonify({"message": "Welcome Admin Dashboard"})


@auth_bp.route("/api/admin/metrics", methods=["GET"])
@token_required(required_role="ADMIN")
def get_metrics():
    total_logs = ip_logs_collection.count_documents({})
    active_blocks = blacklist_collection.count_documents({"type": "blacklist"})
    since_24h = datetime.now() - timedelta(hours=24)
    failed_attempts = ip_logs_collection.count_documents({"status": "FAILED", "login_time": {"$gte": since_24h}})
    whitelisted = blacklist_collection.count_documents({"type": "whitelist"})
    return jsonify({
        "totalLogs": total_logs, "activeBlocks": active_blocks,
        "failedAttempts": failed_attempts, "whitelisted": whitelisted, "status": "Active"
    })


@auth_bp.route("/api/admin/logs", methods=["GET"])
@token_required(required_role="ADMIN")
def get_logs():
    logs = list(ip_logs_collection.find().sort("login_time", -1).limit(100))
    return jsonify([serialize_doc(log) for log in logs])


# ─── Admin: Config ─────────────────────────────────────────────────────────────

@auth_bp.route("/api/admin/config", methods=["GET"])
@token_required(required_role="ADMIN")
def get_security_config():
    cfg = get_config()
    cfg.pop("_id", None)
    return jsonify(cfg)


@auth_bp.route("/api/admin/config", methods=["POST"])
@token_required(required_role="ADMIN")
def save_security_config():
    data = request.get_json()
    max_attempts = int(data.get("max_failed_attempts", 5))
    block_duration = int(data.get("block_duration_minutes", 30))
    config_collection.update_one(
        {"_id": "security_config"},
        {"$set": {"max_failed_attempts": max_attempts,
                  "block_duration_minutes": block_duration,
                  "updated_at": datetime.now()}},
        upsert=True
    )
    return jsonify({"message": "Configuration saved successfully",
                    "max_failed_attempts": max_attempts,
                    "block_duration_minutes": block_duration})


# ─── Admin: Blacklist ──────────────────────────────────────────────────────────

@auth_bp.route("/api/admin/blacklist", methods=["GET"])
@token_required(required_role="ADMIN")
def get_blacklist():
    items = list(blacklist_collection.find({"type": "blacklist"}).sort("blocked_at", -1))
    return jsonify([serialize_doc(item) for item in items])


@auth_bp.route("/api/admin/blacklist", methods=["POST"])
@token_required(required_role="ADMIN")
def add_to_blacklist():
    data = request.get_json()
    ip = data.get("ip_address")
    reason = data.get("reason", "Manually Blocked")
    if not ip:
        return jsonify({"message": "IP address required"}), 400
    blacklist_collection.delete_one({"ip_address": ip, "type": "whitelist"})
    if blacklist_collection.find_one({"ip_address": ip, "type": "blacklist"}):
        return jsonify({"message": "IP already blacklisted"}), 409
    doc = {"ip_address": ip, "reason": reason, "blocked_at": datetime.now(),
           "expires": "Never", "type": "blacklist", "auto_blocked": False}
    result = blacklist_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["blocked_at"] = doc["blocked_at"].strftime("%Y-%m-%d %H:%M:%S")
    return jsonify(doc), 201


@auth_bp.route("/api/admin/blacklist/<path:ip>", methods=["DELETE"])
@token_required(required_role="ADMIN")
def remove_from_blacklist(ip):
    result = blacklist_collection.delete_one({"ip_address": ip, "type": "blacklist"})
    if result.deleted_count == 0:
        return jsonify({"message": "IP not found"}), 404

    # CRITICAL FIX: clear all FAILED logs for this IP so the auto-block
    # counter resets to zero — otherwise the next login attempt immediately
    # re-triggers check_and_auto_block() and blocks the IP again
    cleared = ip_logs_collection.delete_many({
        "ip_address": ip,
        "status": "FAILED"
    })

    return jsonify({
        "message": f"IP {ip} unblocked successfully",
        "failed_logs_cleared": cleared.deleted_count
    })


# ─── Admin: Whitelist ──────────────────────────────────────────────────────────

@auth_bp.route("/api/admin/whitelist", methods=["GET"])
@token_required(required_role="ADMIN")
def get_whitelist():
    items = list(blacklist_collection.find({"type": "whitelist"}).sort("last_access", -1))
    return jsonify([serialize_doc(item) for item in items])


@auth_bp.route("/api/admin/whitelist", methods=["POST"])
@token_required(required_role="ADMIN")
def add_to_whitelist():
    data = request.get_json()
    ip = data.get("ip_address")
    if not ip:
        return jsonify({"message": "IP address required"}), 400
    blacklist_collection.delete_one({"ip_address": ip, "type": "blacklist"})
    if blacklist_collection.find_one({"ip_address": ip, "type": "whitelist"}):
        return jsonify({"message": "IP already whitelisted"}), 409
    doc = {"ip_address": ip, "last_access": datetime.now(),
           "status": "Manually Whitelisted", "type": "whitelist"}
    result = blacklist_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["last_access"] = doc["last_access"].strftime("%Y-%m-%d %H:%M:%S")
    return jsonify(doc), 201


@auth_bp.route("/api/admin/whitelist/<path:ip>", methods=["DELETE"])
@token_required(required_role="ADMIN")
def remove_from_whitelist(ip):
    result = blacklist_collection.delete_one({"ip_address": ip, "type": "whitelist"})
    if result.deleted_count == 0:
        return jsonify({"message": "IP not found"}), 404
    return jsonify({"message": f"IP {ip} removed from whitelist"})


# ─── Admin: Attack Simulation ──────────────────────────────────────────────────

@auth_bp.route("/api/admin/simulate", methods=["POST"])
@token_required(required_role="ADMIN")
def simulate_attack():
    """
    Simulate login attempts from any IP.
    SUCCESS → writes a success log.
    FAILED  → writes a failed log, then runs auto-block check.
    Returns full status including auto_blocked flag and attempts remaining.
    """
    data = request.get_json()
    target_ip = data.get("ip_address", "192.168.1.100")
    status = data.get("status", "FAILED").upper()
    username = data.get("username", "simulated_user")

    if status not in ("SUCCESS", "FAILED"):
        return jsonify({"message": "status must be SUCCESS or FAILED"}), 400

    # Write the simulated log
    ip_logs_collection.insert_one({
        "username": username,
        "ip_address": target_ip,
        "login_time": datetime.now(),
        "status": status,
        "simulated": True
    })

    auto_blocked = False
    cfg = get_config()

    if status == "FAILED":
        auto_blocked = check_and_auto_block(target_ip)

    window = cfg.get("block_duration_minutes", 30)
    since = datetime.now() - timedelta(minutes=window)
    fail_count = ip_logs_collection.count_documents({
        "ip_address": target_ip, "status": "FAILED", "login_time": {"$gte": since}
    })
    max_att = cfg.get("max_failed_attempts", 5)

    return jsonify({
        "message": f"Simulated {status} from {target_ip}",
        "ip_address": target_ip,
        "status": status,
        "auto_blocked": auto_blocked,
        "failed_attempts_in_window": fail_count,
        "max_failed_attempts": max_att,
        "attempts_remaining": max(0, max_att - fail_count)
    }), 201