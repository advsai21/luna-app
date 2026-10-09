import httpx

from .config import get_settings

BASE = "https://api.groq.com/openai/v1"


class GroqError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _headers() -> dict:
    key = get_settings().clean_groq_key
    if not key:
        raise GroqError("GROQ_API_KEY is empty or not loaded (check backend/.env and restart)")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


async def chat(system_prompt: str, messages: list[dict]) -> str:
    s = get_settings()
    payload = {
        "model": s.groq_model,
        "max_tokens": 600,
        "messages": [{"role": "system", "content": system_prompt}, *messages],
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{BASE}/chat/completions", headers=_headers(), json=payload)
    except httpx.HTTPError as e:
        raise GroqError(f"Could not reach Groq: {type(e).__name__}: {e}") from e
    if r.status_code != 200:
        raise GroqError(f"Groq returned {r.status_code}: {r.text[:300]}")
    return r.json()["choices"][0]["message"]["content"] or ""


async def check() -> dict:
    """Diagnostic: is the key loaded, and does Groq accept it?"""
    key = get_settings().clean_groq_key
    info = {"key_loaded": bool(key), "key_prefix_ok": key.startswith("gsk_"), "key_length": len(key)}
    if not key:
        return {**info, "ok": False, "problem": "GROQ_API_KEY not loaded. Check backend/.env and restart."}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{BASE}/models", headers=_headers())
    except httpx.HTTPError as e:
        return {**info, "ok": False, "problem": f"Network error reaching Groq: {type(e).__name__}: {e}"}
    if r.status_code == 401:
        return {**info, "ok": False, "problem": "Groq rejected the key (401). It is wrong, revoked, or the old deleted one."}
    if r.status_code != 200:
        return {**info, "ok": False, "problem": f"Groq returned {r.status_code}: {r.text[:200]}"}
    return {**info, "ok": True, "problem": None}
