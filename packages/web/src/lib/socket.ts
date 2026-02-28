'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { WebSocketEvent, WebSocketEventType } from '@discordbot/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

type Handler = (event: WebSocketEvent) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<WebSocketEventType, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(token: string, guildIds: string[] = []) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/ws`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.ws!.send(JSON.stringify({ type: 'auth', token, guildIds }));

      // Keep-alive ping
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent;
        const eventHandlers = this.handlers.get(data.type);
        if (eventHandlers) {
          for (const handler of eventHandlers) {
            handler(data);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      if (this.pingInterval) clearInterval(this.pingInterval);
      // Reconnect after 5 seconds
      this.reconnectTimer = setTimeout(() => this.connect(token, guildIds), 5000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  on(event: WebSocketEventType, handler: Handler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: WebSocketEventType, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }

  subscribeGuilds(guildIds: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe:guilds', guildIds }));
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const wsClient = new WebSocketClient();

export function useWebSocket(
  eventType: WebSocketEventType,
  handler: Handler,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler: Handler = (event) => handlerRef.current(event);
    return wsClient.on(eventType, stableHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, ...deps]);
}
