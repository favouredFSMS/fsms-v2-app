"use client";

import { useTranslations } from "next-intl";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/ui/cn";
import { Button } from "./button";
import { Icon } from "./icons";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** sm | md | lg */
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Accessible modal dialog (portal + backdrop). ESC and backdrop click close it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="presentation"
    >
      <div
        className="fixed inset-0 bg-ink-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "relative z-10 my-8 w-full rounded-dialog border border-line bg-surface shadow-dialog",
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-field p-1.5 text-ink-faint hover:bg-surface-sunken hover:text-ink focus-ring"
            aria-label={t("closeDialog")}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Convenience footer buttons for <Dialog footer={…} />. */
export function DialogActions({
  onClose,
  confirmLabel = "Confirm",
  onConfirm,
  danger = false,
}: {
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
}) {
  return (
    <>
      <Button variant="secondary" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant={danger ? "danger" : "primary"}
        size="sm"
        onClick={onConfirm ?? onClose}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
