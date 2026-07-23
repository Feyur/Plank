import { useEffect, useRef } from 'react';
import { subscribeRefresh } from './refreshBus';

// Подписка на ручное «обновить» (кнопка в шапке). Экраны без своего WebSocket
// (список досок, дейли) используют это, чтобы обновляться по кнопке.
export function useRefresh(onRefresh: () => void): void {
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => subscribeRefresh(() => cb.current()), []);
}
