"""PNPI · Sondages internes."""
from __future__ import annotations
import uuid, json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..core.auth import User, get_current_user, require_roles, Role
from ..models.pnpi import PollORM, PollVoteORM

router = APIRouter(prefix="/polls", tags=["Polls"])

@router.get("/active")
async def get_active_polls(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    polls = db.execute(select(PollORM).where(PollORM.is_active.is_(True)).order_by(PollORM.created_at.desc())).scalars().all()
    result = []
    for p in polls:
        options = json.loads(p.options)
        votes = db.execute(select(PollVoteORM).where(PollVoteORM.poll_id == p.id)).scalars().all()
        my_vote = next((v.option_index for v in votes if v.username == current_user.username), None)
        vote_counts = [0] * len(options)
        for v in votes:
            if 0 <= v.option_index < len(vote_counts):
                vote_counts[v.option_index] += 1
        result.append({
            "id": p.id, "question": p.question, "options": options,
            "vote_counts": vote_counts, "total_votes": len(votes),
            "my_vote": my_vote, "created_by": p.created_by,
        })
    return {"polls": result}

@router.post("/create")
async def create_poll(data: dict, current_user: User = Depends(require_roles(Role.admin, Role.directeur)), db: Session = Depends(get_db)):
    question = (data.get("question") or "").strip()
    options = data.get("options", [])
    if not question or len(options) < 2:
        raise HTTPException(400, "Question et au moins 2 options requises.")
    poll = PollORM(id=str(uuid.uuid4()), question=question, options=json.dumps(options), created_by=current_user.username)
    db.add(poll)
    db.commit()
    return {"status": "ok", "id": poll.id}

@router.post("/{poll_id}/vote")
async def vote(poll_id: str, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    poll = db.get(PollORM, poll_id)
    if not poll or not poll.is_active:
        raise HTTPException(404, "Sondage introuvable ou ferme.")
    existing = db.execute(select(PollVoteORM).where(PollVoteORM.poll_id == poll_id, PollVoteORM.username == current_user.username)).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Vous avez deja vote.")
    option_index = data.get("option_index", 0)
    options = json.loads(poll.options)
    if not (0 <= option_index < len(options)):
        raise HTTPException(400, "Option invalide.")
    vote = PollVoteORM(id=str(uuid.uuid4()), poll_id=poll_id, username=current_user.username, option_index=option_index)
    db.add(vote)
    db.commit()
    return {"status": "ok"}
