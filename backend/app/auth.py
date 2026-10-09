from fastapi import Header, HTTPException

from . import firebase
from .config import get_settings


def require_admin(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    try:
        claims = firebase.verify_token(authorization[7:])
    except Exception:
        raise HTTPException(401, "Invalid token")
    admin = get_settings().admin_email.strip().lower()
    if not admin or str(claims.get("email", "")).lower() != admin:
        raise HTTPException(403, "Not allowed")
    return claims
