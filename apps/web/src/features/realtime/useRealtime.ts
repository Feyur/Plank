import { useEffect, useRef } from 'react';
import { useRefresh } from './useRefresh';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// URL WebSocket: из абсолютного API-URL (dev) или из текущего origin (прод,
// когда API на том же хосте и VITE_API_URL пустой).
function wsUrl(): string {
  if (baseUrl.startsWith('http')) return baseUrl.replace(/^http/, 'ws') + '/ws';
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}${baseUrl}/ws`;
}

// Подключается к /ws и вызывает onChange (с небольшой задержкой), когда сервер
// сообщает об изменении доски. Переподключается при обрыве.
export function useRealtime(onChange: () => void): void {
  const cb = useRef(onChange);
  cb.current = onChange;

  // Та же реакция и на ручное «обновить» из шапки.
  useRefresh(onChange);

  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      ws = new WebSocket(wsUrl());
      ws.onmessage = () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => cb.current(), 250);
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
    }
    connect();

    return () => {
      closed = true;
      if (debounce) clearTimeout(debounce);
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);
}
