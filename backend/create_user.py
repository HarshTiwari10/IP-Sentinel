from app import create_app
from app.db import users_collection
import bcrypt

app = create_app()

with app.app_context():
    username = "admin"
    password = "admin123"

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    users_collection.insert_one({
        "username": username,
        "password": hashed_password,
        "role": "ADMIN"
    })

    print("Admin user created successfully!")