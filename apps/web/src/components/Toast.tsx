import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { IconCheck, IconClose } from './icons';
import { cx } from '@/lib/styles';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: 'border-sage/30 bg-white text-ink',
  error: 'border-coral/30 bg-white text-ink',
  info: 'border-ink/15 bg-white text-ink',
};

const iconClasses: Record<ToastTone, string> = {
  success: 'bg-sage/15 text-sage',
  error: 'bg-coral/10 text-coral',
  info: 'bg-ink/10 text-ink',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      const timer = window.setTimeout(() => {
        remove(id);
        timers.current = timers.current.filter((item) => item !== timer);
      }, 3400);
      timers.current.push(timer);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm shadow-lift',
              toneClasses[toast.tone],
            )}
          >
            <span
              className={cx(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full',
                iconClasses[toast.tone],
              )}
            >
              {toast.tone === 'error' ? (
                <IconClose className="h-3.5 w-3.5" />
              ) : (
                <IconCheck className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="leading-5">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 内使用');
  }
  return context;
}
