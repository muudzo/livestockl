// WebSocket client for Go backend realtime events
// Connects to ws://host/ws?token=JWT
// Supports channel subscriptions with auto-reconnect

const GO_WS_URL = (import.meta.env.VITE_GO_API_URL || 'http://localhost:8080')
  .replace(/^http/, 'ws');

type Callback = (data: any) => void;

export class GoWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private subscriptions: Map<string, Set<Callback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(url?: string) {
    this.url = url || GO_WS_URL;
  }

  connect(token: string): void {
    this.token = token;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.token = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'client disconnect');
      this.ws = null;
    }
  }

  subscribe(channel: string, callback: Callback): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(callback);

    // Send subscribe message if connected
    this.send({ type: 'subscribe', channel });

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channel);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscriptions.delete(channel);
          this.send({ type: 'unsubscribe', channel });
        }
      }
    };
  }

  private doConnect(): void {
    if (!this.token) return;

    try {
      this.ws = new WebSocket(`${this.url}/ws?token=${this.token}`);
    } catch {
      this.reconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Re-subscribe to all channels
      for (const channel of this.subscriptions.keys()) {
        this.send({ type: 'subscribe', channel });
      }
      // Start ping interval
      this.pingTimer = setInterval(() => {
        this.send({ type: 'ping' });
      }, 30000);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.ws.onclose = () => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.reconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'pong') return;

      // Route to channel subscribers
      const channel = msg.channel;
      if (channel && this.subscriptions.has(channel)) {
        for (const cb of this.subscriptions.get(channel)!) {
          try {
            cb(msg.data || msg);
          } catch (e) {
            console.error('[GoWS] callback error:', e);
          }
        }
      }
    } catch {
      // Ignore non-JSON messages
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    if (!this.token) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }
}

// Singleton instance
export const goWs = new GoWebSocket();
