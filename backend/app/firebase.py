import json

import firebase_admin
from firebase_admin import auth, credentials, firestore

from .config import get_settings

_app = None


def _init():
    global _app
    if _app is not None:
        return _app
    raw = get_settings().firebase_service_account_json.strip()
    if not raw:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not set")
    cred = credentials.Certificate(json.loads(raw) if raw.startswith("{") else raw)
    _app = firebase_admin.initialize_app(cred)
    return _app


def db():
    _init()
    return firestore.client()


def verify_token(token: str) -> dict:
    _init()
    return auth.verify_id_token(token)
