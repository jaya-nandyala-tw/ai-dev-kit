// Minimal pub/sub toast bus — no context provider needed, so any client component (deeply
// nested inside step forms, run buttons, etc.) can fire a toast without prop-drilling. <ToastHost>
// (mounted once in app/layout.tsx) is the only subscriber.

export type ToastKind = "success" | "error" | "info";
export type ToastMessage = { id: string; kind: ToastKind; text: string };

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();

function emit(kind: ToastKind, text: string) {
  const toast: ToastMessage = { id: crypto.randomUUID(), kind, text };
  for (const l of listeners) l(toast);
}

export const toast = {
  success: (text: string) => emit("success", text),
  error: (text: string) => emit("error", text),
  info: (text: string) => emit("info", text),
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
