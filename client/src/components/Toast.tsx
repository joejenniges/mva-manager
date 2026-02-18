import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  removing?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const borderColor: Record<ToastType, string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
};

const iconColor: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
};

const iconPaths: Record<ToastType, string> = {
  success: "M5 13l4 4L19 7",
  error: "M6 18L18 6M6 6l12 12",
  info: "M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    // Mark as removing to trigger slide-out animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);

      const timer = setTimeout(() => {
        removeToast(id);
        timersRef.current.delete(id);
      }, 4000);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastMessage key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isVisible = mounted && !item.removing;

  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`flex w-80 items-center gap-3 rounded border-l-4 bg-gray-800 px-4 py-3 shadow-lg transition-all duration-200 ${borderColor[item.type]} ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <svg
        className={`h-4 w-4 shrink-0 ${iconColor[item.type]}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[item.type]} />
      </svg>
      <span className="text-sm text-gray-100">{item.message}</span>
    </button>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
