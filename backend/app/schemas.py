from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

Reason = Annotated[str, StringConstraints(max_length=60)]


class Msg(BaseModel):
    # "system" is deliberately not allowed: clients cannot inject instructions.
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatIn(BaseModel):
    messages: list[Msg] = Field(min_length=1, max_length=30)
    userName: str = Field(default="", max_length=40)
    userReasons: list[Reason] = Field(default_factory=list, max_length=10)


class ChatOut(BaseModel):
    reply: str


class PoemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=10000)
    note: str = Field(default="", max_length=500)


class PoemOut(PoemIn):
    id: str
    date: str
    createdAt: int
