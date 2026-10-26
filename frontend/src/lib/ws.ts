type MessageHandler = (data: { room?: string; event?: string; type?: string; data?: any }) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private roomCallbacks: Map<string, Set<(msg: any) => void>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private subscribedRooms: Set<string> = new Set();
  private reconnectTimeout: any = null;
  private isConnected = false;

  constructor() {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/stream";
    this.url = wsBase;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Re-subscribe to any previously active rooms
        if (this.subscribedRooms.size > 0) {
          this.send({
            action: "SUBSCRIBE",
            rooms: Array.from(this.subscribedRooms),
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Global handlers
          this.globalHandlers.forEach((handler) => handler(payload));

          // Room-specific callbacks
          const room = payload.room;
          if (room && this.roomCallbacks.has(room)) {
            this.roomCallbacks.get(room)?.forEach((cb) => cb(payload));
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (e) {
      console.error("WebSocket connection error:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  subscribe(room: string, callback: (msg: any) => void): () => void {
    this.subscribedRooms.add(room);
    if (!this.roomCallbacks.has(room)) {
      this.roomCallbacks.set(room, new Set());
    }
    this.roomCallbacks.get(room)!.add(callback);

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: "SUBSCRIBE",
        rooms: [room],
      });
    }

    return () => {
      this.unsubscribe(room, callback);
    };
  }

  unsubscribe(room: string, callback?: (msg: any) => void) {
    if (callback && this.roomCallbacks.has(room)) {
      this.roomCallbacks.get(room)!.delete(callback);
      if (this.roomCallbacks.get(room)!.size === 0) {
        this.roomCallbacks.delete(room);
        this.subscribedRooms.delete(room);
      }
    } else {
      this.roomCallbacks.delete(room);
      this.subscribedRooms.delete(room);
    }

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: "UNSUBSCRIBE",
        rooms: [room],
      });
    }
  }

  subscribeToRooms(rooms: string[]) {
    rooms.forEach((r) => this.subscribedRooms.add(r));
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: "SUBSCRIBE",
        rooms,
      });
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const wsClient = new WebSocketClient();
export const wsService = wsClient;

