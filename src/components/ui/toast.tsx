"use client";

import { useTranslations } from "next-intl";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/ui/cn";
import { Icon, type IconName } from "./icons";

export type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  push: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toneMeta: Record<ToastTone, { icon: IconName; ring: string; iconColor: string }> = {
  success: { icon: "success", ring: "border-success-500/40", iconColor: "text-success-600" },
  error: { icon: "danger", ring: "border-danger-500/40", iconColor: "text-danger-600" },
  info: { icon: "info", ring: "border-info-500/40", iconColor: "text-info-600" },
  warning: { icon: "warning", ring: "border-warning-500/40", iconColor: "text-warning-600" },
};

const AUTO_DISMISS_MS = 4500;

/**
 * Toast / notification provider. Wrap the app (or a route segment) once and
 * call useToast() anywhere underneath to raise notifications.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const commonT = useTranslations("common");
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-4), { id, tone, title, description }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
      warning: (t, d) => push("warning", t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {items.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-card border bg-surface p-3.5 shadow-pop",
                toneMeta[t.tone].ring,
              )}
            >
              <Icon
                name={toneMeta[t.tone].icon}
                size={20}
                className={cn("mt-0.5 shrink-0", toneMeta[t.tone].iconColor)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-sm text-ink-muted">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="rounded-field p-1 text-ink-faint hover:bg-surface-sunken hover:text-ink focus-ring"
                aria-label={commonT("dismissNotification")}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
