import { useEffect, useState } from 'react';

// true на узких экранах (телефон). Слушает изменения ширины/поворот.
export function useIsMobile(): boolean {
  const query = '(max-width: 768px)';
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
