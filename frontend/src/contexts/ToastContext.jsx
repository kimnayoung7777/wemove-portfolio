import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ToastViewport from "../components/ToastViewport";

const ToastContext = createContext(null);

let nextToastId = 1;

const getToastKey = (toast) => toast.sourceId || toast.id;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      message = "",
      tone = "info",
      sourceId,
      target,
      duration = 2600,
    }) => {
      const id = nextToastId;
      nextToastId += 1;
      const nextToast = { id, title, message, tone, sourceId, target };

      setToasts((current) => {
        if (!sourceId) {
          return [...current, nextToast];
        }

        const existingIndex = current.findIndex(
          (toast) => getToastKey(toast) === sourceId,
        );

        if (existingIndex === -1) {
          return [...current, nextToast];
        }

        const next = [...current];
        next[existingIndex] = nextToast;
        return next;
      });

      if (duration > 0) {
        window.setTimeout(() => {
          setToasts((current) =>
            current.filter((toast) =>
              sourceId
                ? !(toast.sourceId === sourceId && toast.id === id)
                : toast.id !== id,
            ),
          );
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      success: (title, message, options = {}) =>
        showToast({ ...options, title, message, tone: "success" }),
      error: (title, message, options = {}) =>
        showToast({ ...options, title, message, tone: "error" }),
      info: (title, message, options = {}) =>
        showToast({ ...options, title, message, tone: "info" }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
