import { useCallback, useState } from 'react';
import { Toast } from './Toast';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  variant: ToastVariant;
  key: number;
}

/** Small page-level toast holder: show(message, variant) then render <ToastHost …/>. */
export function useToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToast({ message, variant, key: Date.now() });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

export function ToastHost({ toast, dismiss }: { toast: ToastState | null; dismiss: () => void }) {
  if (!toast) return null;
  return <Toast key={toast.key} message={toast.message} variant={toast.variant} onDismiss={dismiss} />;
}
