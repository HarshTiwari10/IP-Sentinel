from pymongo import MongoClient
import os

MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://HarshTiwari:Harsh123@ipsentinal.oj1nlis.mongodb.net/ip_monitoring_system?retryWrites=true&w=majority&appName=IPSentinal"
)

client = MongoClient(MONGO_URI)
db = client["ip_monitoring_system"]

users_collection = db["users"]
ip_logs_collection = db["ip_logs"]
blacklist_collection = db["blacklist"]
config_collection = db["config"]