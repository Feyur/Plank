import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// Маленькие уведомления об ошибках/событиях. Появляются справа внизу,
// исчезают сами. push('текст') — из любого компонента через useToast().

interface Toast {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            style={{
              maxWidth: 340,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              font: 'var(--text-ui)',
              boxShadow: 'var(--shadow-dropdown)',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
