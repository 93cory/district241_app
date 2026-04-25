"""PNPI · Endpoint chat assistant (Claude API)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import User, get_current_user
from ..core.chat_assistant import ask_claude, is_enabled
from ..database import get_db

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
    fallback: bool = False
    cached_tokens: int = 0
    output_tokens: int = 0


@router.get("/status")
async def chat_status(_: User = Depends(get_current_user)):
    """Indique si l'assistant IA est configure et disponible."""
    return {"enabled": is_enabled()}


@router.post("/ask", response_model=ChatResponse)
async def chat_ask(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pose une question a l'assistant IA PNPI."""
    role_values = [r.value if hasattr(r, "value") else str(r) for r in current_user.roles]
    try:
        result = ask_claude(payload.question, current_user.username, role_values)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Audit léger : on ne stocke pas la question complète (peut être sensible)
    # mais on trace l'usage pour quotas / abus.
    write_audit_event(
        db,
        actor=current_user.username,
        action="chat.ask",
        target="claude",
        details=f"question_len={len(payload.question)}; fallback={result.get('fallback', False)}",
    )
    db.commit()

    return ChatResponse(
        answer=result["answer"],
        fallback=result.get("fallback", False),
        cached_tokens=result.get("cached_tokens", 0),
        output_tokens=result.get("output_tokens", 0),
    )
