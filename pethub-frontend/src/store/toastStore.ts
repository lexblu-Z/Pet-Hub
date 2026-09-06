import { useMemo } from 'react';
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Track recent toasts for deduplication (3.5s window)
const recentToastTimestamps = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 3500;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const key = `${toast.type}:${toast.title.trim()}:${(toast.message || '').trim()}`;
    const now = Date.now();
    const lastSeen = recentToastTimestamps.get(key);

    // Prevent duplicate toast if fired within the deduplication window
    if (lastSeen && now - lastSeen < DEDUPLICATION_WINDOW_MS) {
      return;
    }

    // Also verify if an identical toast is already currently active in state
    const alreadyActive = get().toasts.some(
      (t) => t.type === toast.type && t.title === toast.title && t.message === toast.message
    );
    if (alreadyActive) {
      return;
    }

    recentToastTimestamps.set(key, now);

    // Clean up old keys periodically
    if (recentToastTimestamps.size > 50) {
      for (const [k, timestamp] of recentToastTimestamps.entries()) {
        if (now - timestamp > DEDUPLICATION_WINDOW_MS * 2) {
          recentToastTimestamps.delete(k);
        }
      }
    }

    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Standalone toast methods that can be called anywhere
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
};

// React hook returning stable memoized handlers
export const useToast = () => {
  return useMemo(
    () => ({
      success: (title: string, message?: string) =>
        useToastStore.getState().addToast({ type: 'success', title, message }),
      error: (title: string, message?: string) =>
        useToastStore.getState().addToast({ type: 'error', title, message }),
      warning: (title: string, message?: string) =>
        useToastStore.getState().addToast({ type: 'warning', title, message }),
      info: (title: string, message?: string) =>
        useToastStore.getState().addToast({ type: 'info', title, message }),
    }),
    []
  );
};
