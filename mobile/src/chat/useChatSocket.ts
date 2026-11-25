import { useCallback, useEffect, useRef, useState } from "react";

import { API_URL } from "@/api/client";
import type { ServerEvent } from "@/api/chat";
import { useAuth } from "@/store/auth";

function socketUrl(apiUrl: string) {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function useChatSocket(onEvent: (event: ServerEvent) => void) {
  const token = useAuth((s) => s.token);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const wsRef = useRef<WebSocket | null>(null);
  const openRef = useRef(false);
  const [connected, setConnected] = useState(false);

  const sendRaw = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (!openRef.current || !ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  useEffect(() => {
    if (!token || !API_URL) return;
    let alive = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;

    const connect = () => {
      const ws = new WebSocket(socketUrl(API_URL as string));
      socket = ws;
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token }));
      };
      ws.onmessage = (event) => {
        let data: ServerEvent;
        try {
          data = JSON.parse(String(event.data)) as ServerEvent;
        } catch {
          return;
        }
        if (data.type === "auth_ok") {
          attempt = 0;
          openRef.current = true;
          setConnected(true);
        }
        onEventRef.current(data);
      };
      ws.onerror = () => ws.close();
      ws.onclose = (event) => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          openRef.current = false;
          setConnected(false);
        }
        if (!alive || event.code === 1008 || wsRef.current) return;
        const delay = Math.min(30_000, 1000 * 2 ** attempt);
        attempt += 1;
        timer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      openRef.current = false;
      setConnected(false);
      socket?.close();
      if (wsRef.current === socket) wsRef.current = null;
    };
  }, [token]);

  return { connected, sendRaw };
}
