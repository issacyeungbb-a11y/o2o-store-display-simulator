from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai import ask_assistant, generate_daily_brief, get_assistant_config
from models import (
    Asset,
    AssetCreate,
    AssistantConfigResponse,
    AssistantResponse,
    ChatTurn,
    DailyBriefResponse,
    DeleteResponse,
    PortfolioResponse,
    SuggestedAsset,
)
from storage import bulk_create_assets, create_asset, delete_asset, load_portfolio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Portfolio Intelligence API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/portfolio", response_model=PortfolioResponse)
def get_portfolio() -> PortfolioResponse:
    logger.info("GET /api/portfolio")
    return load_portfolio()


@app.post("/api/assets", response_model=Asset)
def add_asset(payload: AssetCreate) -> Asset:
    logger.info("POST /api/assets")
    return create_asset(payload)


@app.post("/api/assets/bulk", response_model=list[Asset])
def add_assets_bulk(payload: list[SuggestedAsset]) -> list[Asset]:
    logger.info("POST /api/assets/bulk (%s items)", len(payload))
    return bulk_create_assets(payload)


@app.delete("/api/assets/{asset_id}", response_model=DeleteResponse)
def remove_asset(asset_id: str) -> DeleteResponse:
    logger.info("DELETE /api/assets/%s", asset_id)
    if not delete_asset(asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    return DeleteResponse(status="ok", deleted_id=asset_id)


@app.get("/api/assistant/config", response_model=AssistantConfigResponse)
def assistant_config() -> AssistantConfigResponse:
    logger.info("GET /api/assistant/config")
    return get_assistant_config()


@app.post("/api/assistant/chat", response_model=AssistantResponse)
async def assistant_chat(
    message: str = Form(...),
    history: str = Form("[]"),
    image: Optional[UploadFile] = File(default=None),
) -> AssistantResponse:
    logger.info("POST /api/assistant/chat")
    portfolio = load_portfolio()
    try:
        parsed_history = [ChatTurn(**item) for item in json.loads(history or "[]")]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid conversation history payload") from exc

    image_bytes = await image.read() if image else None
    image_mime_type = image.content_type if image else None

    return ask_assistant(
        message=message,
        history=parsed_history,
        portfolio=portfolio,
        image_bytes=image_bytes,
        image_mime_type=image_mime_type,
    )


@app.get("/api/assistant/daily-brief", response_model=DailyBriefResponse)
def daily_brief() -> DailyBriefResponse:
    logger.info("GET /api/assistant/daily-brief")
    return generate_daily_brief(load_portfolio())


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
