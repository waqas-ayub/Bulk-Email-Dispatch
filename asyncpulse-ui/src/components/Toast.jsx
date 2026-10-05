import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    border: 'border-success/30',
    bg: 'bg-success/10',
    icon: 'text-success',
    glow: 'shadow-success/20',
  },
  error: {
    border: 'border-error/30',
    bg: 'bg-error/10',
    icon: 'text-error',
    glow: 'shadow-error/20',
  },
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning/10',
    icon: 'text-warning',
    glow: 'shadow-warning/20',
  },
  info: {
    border: 'border-info/30',
    bg: 'bg-info/10',
    icon: 'text-info',
    glow: 'shadow-info/20',
  },
};

function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ICONS[toast.type] || Info;
  const styles = STYLES[toast.type] || STYLES.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 w-96 max-w-[calc(100vw-2rem)]
        rounded-xl border ${styles.border} ${styles.bg} backdrop-blur-xl
        p-4 shadow-2xl ${styles.glow}
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-in'}
      `}
      role="alert"
    >
      <div className={`shrink-0 ${styles.icon}`}>
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-white mb-0.5">
            {toast.title}
          </p>
        )}
        <p className="text-xs text-white/70 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}