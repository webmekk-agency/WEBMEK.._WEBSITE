from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-secret-key")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///../data/webmek.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(app, supports_credentials=True)
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(30), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="client", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Lead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    business = db.Column(db.String(180), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    business_type = db.Column(db.String(100), nullable=False)
    budget = db.Column(db.String(80), nullable=False)
    selected_plan = db.Column(db.String(120), nullable=True)
    requirement = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(40), default="New", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    lead_id = db.Column(db.Integer, db.ForeignKey("lead.id"), nullable=True)
    title = db.Column(db.String(180), nullable=False)
    status = db.Column(db.String(60), default="Requirement Received")
    progress = db.Column(db.Integer, default=10)
    amount = db.Column(db.Float, default=0)
    paid = db.Column(db.Float, default=0)
    preview_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Login required"}), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Login required"}), 401
        user = db.session.get(User, session["user_id"])
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def whatsapp_message(lead: Lead) -> str:
    return "\n".join([
        "🔔 NEW WEBMEK LEAD",
        "",
        f"Lead ID: WMK-{lead.id:05d}",
        f"Name: {lead.name}",
        f"Business: {lead.business}",
        f"WhatsApp: {lead.phone}",
        f"City: {lead.city}",
        f"Business Type: {lead.business_type}",
        f"Budget: {lead.budget}",
        f"Selected Plan: {lead.selected_plan or 'Not selected'}",
        "",
        f"Requirement: {lead.requirement}",
        "",
        f"Received: {lead.created_at.strftime('%d-%m-%Y %I:%M %p')}",
        "Source: WebMek Website",
    ])


def send_whatsapp_cloud_message(message: str) -> tuple[bool, str]:
    token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    admin_number = os.getenv("WHATSAPP_ADMIN_NUMBER", "").strip()

    if not all([token, phone_number_id, admin_number]):
        return False, "WhatsApp Cloud API credentials are not configured"

    url = f"https://graph.facebook.com/v23.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": admin_number,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=12)
        if response.ok:
            return True, "WhatsApp notification sent"
        return False, f"WhatsApp API error: {response.status_code}"
    except requests.RequestException as exc:
        return False, f"WhatsApp request failed: {exc}"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admin")
def admin_page():
    return render_template("admin.html")


@app.route("/client")
def client_page():
    return render_template("client.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "WebMek"})


@app.post("/api/signup")
def signup():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        name=name,
        email=email,
        phone=phone,
        password_hash=generate_password_hash(password),
        role="client",
    )
    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id
    return jsonify({
        "message": "Account created",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user.id
    return jsonify({
        "message": "Login successful",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    })


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.get("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"authenticated": False})
    user = db.session.get(User, session["user_id"])
    if not user:
        session.clear()
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "user": {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone, "role": user.role},
    })


@app.post("/api/leads")
def create_lead():
    data = request.get_json(silent=True) or {}
    required = ["name", "business", "phone", "city", "businessType", "budget", "requirement"]
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    lead = Lead(
        name=str(data["name"]).strip(),
        business=str(data["business"]).strip(),
        phone=str(data["phone"]).strip(),
        city=str(data["city"]).strip(),
        business_type=str(data["businessType"]).strip(),
        budget=str(data["budget"]).strip(),
        selected_plan=str(data.get("selectedPlan", "")).strip() or None,
        requirement=str(data["requirement"]).strip(),
    )
    db.session.add(lead)
    db.session.commit()

    message = whatsapp_message(lead)
    sent, whatsapp_status = send_whatsapp_cloud_message(message)

    return jsonify({
        "message": "Lead received",
        "lead_id": f"WMK-{lead.id:05d}",
        "whatsapp_sent": sent,
        "whatsapp_status": whatsapp_status,
        "whatsapp_text": message,
    }), 201


@app.get("/api/leads")
@admin_required
def get_leads():
    leads = Lead.query.order_by(Lead.created_at.desc()).all()
    return jsonify({
        "leads": [
            {
                "id": lead.id,
                "lead_id": f"WMK-{lead.id:05d}",
                "name": lead.name,
                "business": lead.business,
                "phone": lead.phone,
                "city": lead.city,
                "business_type": lead.business_type,
                "budget": lead.budget,
                "selected_plan": lead.selected_plan,
                "requirement": lead.requirement,
                "status": lead.status,
                "created_at": lead.created_at.isoformat(),
            }
            for lead in leads
        ]
    })


@app.patch("/api/leads/<int:lead_id>")
@admin_required
def update_lead(lead_id):
    lead = db.session.get(Lead, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        lead.status = str(data["status"]).strip()
    db.session.commit()
    return jsonify({"message": "Lead updated"})


@app.get("/api/projects")
@login_required
def get_projects():
    user = db.session.get(User, session["user_id"])
    if user.role == "admin":
        projects = Project.query.order_by(Project.created_at.desc()).all()
    else:
        projects = Project.query.filter_by(user_id=user.id).order_by(Project.created_at.desc()).all()

    return jsonify({
        "projects": [
            {
                "id": project.id,
                "title": project.title,
                "status": project.status,
                "progress": project.progress,
                "amount": project.amount,
                "paid": project.paid,
                "preview_url": project.preview_url,
                "created_at": project.created_at.isoformat(),
            }
            for project in projects
        ]
    })


@app.post("/api/admin/projects")
@admin_required
def create_project():
    data = request.get_json(silent=True) or {}
    if not data.get("title"):
        return jsonify({"error": "Project title is required"}), 400

    project = Project(
        user_id=data.get("user_id"),
        lead_id=data.get("lead_id"),
        title=data["title"].strip(),
        status=data.get("status", "Requirement Received"),
        progress=int(data.get("progress", 10)),
        amount=float(data.get("amount", 0)),
        paid=float(data.get("paid", 0)),
        preview_url=data.get("preview_url"),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({"message": "Project created", "id": project.id}), 201


@app.cli.command("init-db")
def init_db_command():
    db.create_all()
    print("Database initialized.")


def bootstrap():
    with app.app_context():
        db.create_all()

        admin_email = os.getenv("ADMIN_EMAIL", "admin@webmek.in").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@123456")

        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                name="WebMek Admin",
                email=admin_email,
                password_hash=generate_password_hash(admin_password),
                role="admin",
            )
            db.session.add(admin)
            db.session.commit()


bootstrap()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
