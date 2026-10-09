from fastapi.testclient import TestClient

from app import groq_client, poems_repo
from app.auth import require_admin
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_chat_rejects_system_role():
    r = client.post("/chat", json={"messages": [{"role": "system", "content": "evil"}]})
    assert r.status_code == 422


def test_chat_ok(monkeypatch):
    async def fake(prompt, messages):
        assert "Luna" in prompt and messages[0]["role"] == "user"
        return "hi there"

    monkeypatch.setattr(groq_client, "chat", fake)
    r = client.post("/chat", json={"messages": [{"role": "user", "content": "hello"}], "userName": "N"})
    assert r.status_code == 200 and r.json() == {"reply": "hi there"}


def test_chat_upstream_error_hides_detail(monkeypatch):
    async def boom(prompt, messages):
        raise groq_client.GroqError("secret detail")

    monkeypatch.setattr(groq_client, "chat", boom)
    r = client.post("/chat", json={"messages": [{"role": "user", "content": "hello"}]})
    assert r.status_code == 502 and "secret" not in r.text


def test_list_poems(monkeypatch):
    p = {"id": "1", "title": "t", "content": "c", "note": "", "date": "May 1, 2026", "createdAt": 1}
    monkeypatch.setattr(poems_repo, "list_poems", lambda: [p])
    assert client.get("/poems").json() == [p]


def test_create_poem_requires_auth():
    assert client.post("/poems", json={"title": "a", "content": "b"}).status_code == 401


def test_create_poem_as_admin(monkeypatch):
    app.dependency_overrides[require_admin] = lambda: {"email": "me@x.com"}
    monkeypatch.setattr(
        poems_repo, "add_poem",
        lambda t, c, n: {"id": "9", "title": t, "content": c, "note": n, "date": "May 1, 2026", "createdAt": 1},
    )
    try:
        r = client.post("/poems", json={"title": "a", "content": "b"})
        assert r.status_code == 201 and r.json()["id"] == "9"
    finally:
        app.dependency_overrides.clear()


def test_delete_poem_requires_auth():
    assert client.delete("/poems/abc").status_code == 401
