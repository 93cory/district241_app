"""PNPI · WebSocket pour notifications temps reel."""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, List, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..config import settings
from ..core.auth import csv_to_roles, Role
from ..database import SessionLocal, now_utc
from ..models.core import NotificationORM

logger = logging.getLogger("pnpi.ws")

router = APIRouter(tags=["WebSocket"])

# Active connections per username
_connections: Dict[str, List[WebSocket]] = defaultdict(list)


async def _authenticate_ws(token: str) -> dict | None:
    """Verify JWT token for WebSocket connection."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username = payload.get("sub")
        roles = payload.get("roles", [])
        if not username:
            return None
        return {"username": username, "roles": roles}
    except JWTError:
        return None


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = Query(...)):
    user = await _authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Token invalide")
        return

    await websocket.accept()
    username = user["username"]
    _connections[username].append(websocket)
    logger.info(f"[WS] {username} connecte ({len(_connections[username])} connexions)")

    try:
        # Send initial unread count
        db = SessionLocal()
        try:
            unread = db.execute(
                select(NotificationORM).where(NotificationORM.is_read.is_(False))
            ).scalars().all()
            user_roles = set(user["roles"])
            user_notifs = [n for n in unread if n.target_role is None or n.target_role in user_roles]
            await websocket.send_json({
                "type": "init",
                "unread_count": len(user_notifs),
                "timestamp": now_utc().isoformat(),
            })
        finally:
            db.close()

        # Keep connection alive, listen for pings
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"[WS] Erreur pour {username}: {e}")
    finally:
        _connections[username].remove(websocket)
        if not _connections[username]:
            del _connections[username]
        logger.info(f"[WS] {username} deconnecte")


async def broadcast_notification(target_role: str | None, title: str, severity: str = "info"):
    """Broadcast a notification to all connected users with matching role."""
    message = json.dumps({
        "type": "notification",
        "title": title,
        "severity": severity,
        "target_role": target_role,
        "timestamp": now_utc().isoformat(),
    })

    dead: List[tuple] = []
    for username, sockets in _connections.items():
        for ws in sockets:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append((username, ws))

    for username, ws in dead:
        if ws in _connections.get(username, []):
            _connections[username].remove(ws)
