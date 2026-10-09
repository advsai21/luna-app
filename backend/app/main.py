import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import groq_client, poems_repo
from .auth import require_admin
from .config import get_settings
from .prompt import build_system_prompt
from .ratelimit import chat_rate_limit
from .schemas import ChatIn, ChatOut, PoemIn, PoemOut

log = logging.getLogger("luna")
settings = get_settings()

app = FastAPI(title="Luna API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/groq")
async def health_groq():
    """Open this in the browser to see exactly why chat is failing."""
    return await groq_client.check()


@app.post("/chat", response_model=ChatOut, dependencies=[Depends(chat_rate_limit)])
async def chat(body: ChatIn):
    prompt = build_system_prompt(body.userName, body.userReasons)
    try:
        reply = await groq_client.chat(prompt, [m.model_dump() for m in body.messages])
    except groq_client.GroqError as e:
        log.error("Groq failure: %s", e.message)
        raise HTTPException(502, e.message if get_settings().debug else "Chat service unavailable")
    return {"reply": reply}


@app.get("/poems", response_model=list[PoemOut])
def get_poems():
    return poems_repo.list_poems()


@app.post("/poems", response_model=PoemOut, status_code=201, dependencies=[Depends(require_admin)])
def create_poem(body: PoemIn):
    return poems_repo.add_poem(body.title, body.content, body.note)


@app.delete("/poems/{poem_id}", status_code=204, dependencies=[Depends(require_admin)])
def remove_poem(poem_id: str):
    poems_repo.delete_poem(poem_id)
