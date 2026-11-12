import { useEffect, type ReactNode } from 'react';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  durationMs?: number;
  onDismiss: () => void;
  children?: ReactNode;
}

/** Auto-dismissing status message. role="status" keeps it announced to screen readers. */
export function Toast({ message, variant = 'info', durationMs = 4000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div role="status" className={`toast toast-${variant}`}>
      <span>{message}</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
