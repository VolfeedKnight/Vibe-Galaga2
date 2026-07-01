from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "scores.db"

app = FastAPI(title="Mini Galaga Score API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreCreate(BaseModel):
    player_name: str = Field(default="guest", max_length=32)
    score: int = Field(ge=0)
    stage: int = Field(ge=1)
    wave: int = Field(ge=1)


class ScoreRead(ScoreCreate):
    id: int
    created_at: str


class ScoreListResponse(BaseModel):
    items: list[ScoreRead]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL DEFAULT 'guest',
                score INTEGER NOT NULL CHECK(score >= 0),
                stage INTEGER NOT NULL CHECK(stage >= 1),
                wave INTEGER NOT NULL CHECK(wave >= 1),
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scores", response_model=ScoreRead, status_code=201)
def create_score(payload: ScoreCreate) -> ScoreRead:
    created_at = datetime.now(timezone.utc).isoformat()
    payload_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    player_name = payload_data["player_name"].strip() or "guest"
    payload_data["player_name"] = player_name

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO scores (player_name, score, stage, wave, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                player_name,
                payload_data["score"],
                payload_data["stage"],
                payload_data["wave"],
                created_at,
            ),
        )
        conn.commit()
        score_id = int(cursor.lastrowid or 0)

    return ScoreRead(id=score_id, created_at=created_at, **payload_data)


@app.get("/scores", response_model=ScoreListResponse)
def list_scores(limit: Annotated[int, Query(ge=1, le=100)] = 10) -> ScoreListResponse:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, player_name, score, stage, wave, created_at
            FROM scores
            ORDER BY score DESC, created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = [ScoreRead(**dict(row)) for row in rows]
    return ScoreListResponse(items=items)


@app.get("/scores/{score_id}", response_model=ScoreRead)
def get_score(score_id: int) -> ScoreRead:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, player_name, score, stage, wave, created_at
            FROM scores
            WHERE id = ?
            """,
            (score_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Score not found")

    return ScoreRead(**dict(row))
