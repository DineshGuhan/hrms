import { useEffect, type ReactNode } from 'react';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  durationMs?: number;
  onDismiss: () => void;
  children?: ReactNode;
}

const styles = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error: 'border-l-4 border-red-500 bg-white',
  info: 'border-l-4 border-brand-500 bg-white',
} as const;

/** Auto-dismissing status message. role="status" keeps it announced to screen readers. */
export function Toast({
  message,
  variant = 'info',
  durationMs = 4000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-ink shadow-lg ${styles[variant]}`}
    >
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-muted transition hover:text-ink"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
