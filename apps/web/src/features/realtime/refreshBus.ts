// Локальная шина «обновить всё»: кнопка в шапке дёргает triggerRefresh(),
// и все подписанные экраны перезапрашивают свои данные — как при realtime-сигнале,
// но по требованию пользователя (ручная мини-синхронизация).
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeRefresh(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function triggerRefresh(): void {
  for (const cb of listeners) cb();
}
