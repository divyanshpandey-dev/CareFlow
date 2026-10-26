import asyncio
import json
import logging
from typing import Any, Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger("careflow.websocket")


class WebSocketManager:
    def __init__(self) -> None:
        # Maps room_id -> set of active WebSockets
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Maps websocket -> set of subscribed rooms
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accepts and registers a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.client_subscriptions[websocket] = set()
        logger.info("WebSocket connected. Total active clients: %d", len(self.client_subscriptions))

    async def disconnect(self, websocket: WebSocket) -> None:
        """Cleans up on client disconnection."""
        async with self._lock:
            subscribed_rooms = self.client_subscriptions.pop(websocket, set())
            for room in subscribed_rooms:
                if room in self.rooms:
                    self.rooms[room].discard(websocket)
                    if not self.rooms[room]:
                        del self.rooms[room]
        logger.info("WebSocket disconnected. Remaining clients: %d", len(self.client_subscriptions))

    async def subscribe(self, websocket: WebSocket, room: str) -> None:
        """Subscribes an active connection to a specific topic room."""
        async with self._lock:
            if websocket not in self.client_subscriptions:
                self.client_subscriptions[websocket] = set()
            self.client_subscriptions[websocket].add(room)

            if room not in self.rooms:
                self.rooms[room] = set()
            self.rooms[room].add(websocket)
        logger.debug("Client subscribed to room: %s (Total in room: %d)", room, len(self.rooms[room]))

    async def unsubscribe(self, websocket: WebSocket, room: str) -> None:
        """Unsubscribes a client from a room."""
        async with self._lock:
            if websocket in self.client_subscriptions:
                self.client_subscriptions[websocket].discard(room)
            if room in self.rooms:
                self.rooms[room].discard(websocket)
                if not self.rooms[room]:
                    del self.rooms[room]

    async def broadcast_to_room(self, room: str, event_type: str, data: Any) -> None:
        """Broadcasts an event with a structured payload to all subscribers in a room."""
        payload = json.dumps({
            "room": room,
            "event": event_type,
            "data": data,
        })
        targets: List[WebSocket] = []
        async with self._lock:
            if room in self.rooms:
                targets = list(self.rooms[room])

        if not targets:
            return

        dead_connections: List[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning("Failed to send message to websocket client: %s", e)
                dead_connections.append(ws)

        for dead_ws in dead_connections:
            await self.disconnect(dead_ws)

    async def broadcast_global(self, event_type: str, data: Any) -> None:
        """Broadcasts to all currently connected clients across all rooms."""
        payload = json.dumps({
            "room": "*",
            "event": event_type,
            "data": data,
        })
        all_clients: List[WebSocket] = []
        async with self._lock:
            all_clients = list(self.client_subscriptions.keys())

        for ws in all_clients:
            try:
                await ws.send_text(payload)
            except Exception:
                pass

    async def broadcast_hospital_event(self, hospital_id: str, data: Any) -> None:
        """Broadcasts operational event to hospital-scoped room and waiting room."""
        await self.broadcast_to_room(f"hospital:{hospital_id}", "HOSPITAL_OPERATIONAL_EVENT", data)
        await self.broadcast_to_room("waiting_room", "HOSPITAL_OPERATIONAL_EVENT", data)


# Global singleton instance
ws_manager = WebSocketManager()

