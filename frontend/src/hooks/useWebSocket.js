import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(path, params = {}) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('enderpanel_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const queryParams = new URLSearchParams({ token, ...params }).toString();
    const url = `${protocol}//${host}${path}?${queryParams}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => {
          if (data.type === 'history') return data.data || [];
          const next = [...prev, data];
          if (next.length > 500) return next.slice(-500);
          return next;
        });
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [path, JSON.stringify(params)]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, connected, send, clear };
}
