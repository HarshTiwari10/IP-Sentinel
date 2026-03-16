from flask import Blueprint, jsonify, request
from datetime import datetime
from app.db import ip_logs_collection, blacklist_collection

dashboard_bp = Blueprint("dashboard", __name__)

# ==============================
# ✅ 1. GET ALL LOGS (LIVE TABLE)
# ==============================
@dashboard_bp.route("/api/logs", methods=["GET"])
def get_logs():
    logs = list(ip_logs_collection.find({}, {"_id": 0}).sort("login_time", -1))
    return jsonify(logs)


# ==============================
# ✅ 2. GET BLACKLIST
# ==============================
@dashboard_bp.route("/api/blacklist", methods=["GET"])
def get_blacklist():
    data = list(blacklist_collection.find({}, {"_id": 0}))
    return jsonify(data)


# ==============================
# ✅ 3. GET STATS (TOP CARDS)
# ==============================
@dashboard_bp.route("/api/stats", methods=["GET"])
def get_stats():

    total_logs = ip_logs_collection.count_documents({})
    total_blocks = blacklist_collection.count_documents({})

    failed_attempts = ip_logs_collection.count_documents({"status": "FAILED"})

    return jsonify({
        "totalLogs": total_logs,
        "activeBlocks": total_blocks,
        "failedAttempts": failed_attempts,
        "status": "Active"
    })


# ==============================
# ✅ 4. ATTACK SIMULATION (IMPORTANT)
# ==============================
failed_attempts_tracker = {}

@dashboard_bp.route("/api/simulate", methods=["POST"])
def simulate_attack():

    data = request.json
    ip = data.get("ip")
    success = data.get("success")

    if not ip:
        return jsonify({"error": "IP required"}), 400

    if ip not in failed_attempts_tracker:
        failed_attempts_tracker[ip] = 0

    # SUCCESS LOGIN
    if success:
        status = "SUCCESS"
        failed_attempts_tracker[ip] = 0

    # FAILED LOGIN
    else:
        status = "FAILED"
        failed_attempts_tracker[ip] += 1

        # AUTO BLOCK CONDITION (5 FAILS)
        if failed_attempts_tracker[ip] >= 5:
            blacklist_collection.insert_one({
                "ip": ip,
                "reason": "Multiple Failed Attempts",
                "blockedAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "expires": "Auto"
            })

    # SAVE LOG
    ip_logs_collection.insert_one({
        "login_time": datetime.now(),
        "ip_address": ip,
        "status": status,
        "username": "Simulation"
    })

    return jsonify({"message": "Simulation Done"})