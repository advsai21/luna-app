import time
from datetime import datetime, timezone

from . import firebase

COLLECTION = "poems"


def list_poems() -> list[dict]:
    docs = firebase.db().collection(COLLECTION).order_by("createdAt", direction="DESCENDING").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def add_poem(title: str, content: str, note: str) -> dict:
    now = datetime.now(timezone.utc)
    data = {
        "title": title,
        "content": content,
        "note": note,
        "date": f"{now:%B} {now.day}, {now.year}",
        "createdAt": int(time.time() * 1000),
    }
    _, ref = firebase.db().collection(COLLECTION).add(data)
    return {"id": ref.id, **data}


def delete_poem(poem_id: str) -> None:
    firebase.db().collection(COLLECTION).document(poem_id).delete()
