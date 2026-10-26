import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.core.websocket_manager import ws_manager
from backend.app.api.v1.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("careflow")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown events."""
    logger.info("Starting CareFlow Healthcare Operating Layer...")
    # Initialize database tables
    await init_db()
    yield
    logger.info("Shutting down CareFlow...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description="CareFlow — Unified, Consent-Driven Healthcare Journey Coordination Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def root_health_check():
    """Liveness probe for orchestration and load balancers."""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
    }


@app.websocket(f"{settings.API_V1_STR}/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    Unified WebSocket endpoint for multi-role real-time synchronization.
    Clients subscribe to rooms such as:
    - 'hospital:{id}:queue'
    - 'doctor:{id}:queue'
    - 'patient:{id}:journey'
    - 'ticket:{id}'
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                action = data.get("action")
                
                if action == "SUBSCRIBE":
                    rooms = data.get("rooms", [])
                    if isinstance(rooms, str):
                        rooms = [rooms]
                    for room in rooms:
                        await ws_manager.subscribe(websocket, room)
                    await websocket.send_text(json.dumps({
                        "event": "SUBSCRIBED",
                        "rooms": rooms,
                        "status": "active"
                    }))

                elif action == "UNSUBSCRIBE":
                    rooms = data.get("rooms", [])
                    if isinstance(rooms, str):
                        rooms = [rooms]
                    for room in rooms:
                        await ws_manager.unsubscribe(websocket, room)
                    await websocket.send_text(json.dumps({
                        "event": "UNSUBSCRIBED",
                        "rooms": rooms
                    }))

                elif action == "PING":
                    await websocket.send_text(json.dumps({"event": "PONG"}))

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "event": "ERROR",
                    "message": "Malformed JSON payload."
                }))
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket unexpected error: %s", e)
        await ws_manager.disconnect(websocket)
