"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ActiveAlert, AlertVariant } from "./alertTypes";
import { defaultTitleForVariant, dismissActiveAlert } from "./alertStore";

function VariantIcon({ variant }: { variant: AlertVariant }) {
  const className = "w-6 h-6";
  switch (variant) {
    case "success":
      return <CheckCircle2 className={`${className} text-emerald-600`} aria-hidden />;
    case "error":
      return <AlertCircle className={`${className} text-red-600`} aria-hidden />;
    case "warning":
      return <AlertTriangle className={`${className} text-amber-600`} aria-hidden />;
    default:
      return <Info className={`${className} text-blue-600`} aria-hidden />;
  }
}

function variantAccent(variant: AlertVariant): string {
  switch (variant) {
    case "success":
      return "bg-emerald-50 ring-emerald-100";
    case "error":
      return "bg-red-50 ring-red-100";
    case "warning":
      return "bg-amber-50 ring-amber-100";
    default:
      return "bg-blue-50 ring-blue-100";
  }
}

type AppAlertDialogProps = {
  alert: ActiveAlert | null;
};

export default function AppAlertDialog({ alert }: AppAlertDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!alert) return;
    const t = window.setTimeout(() => primaryRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [alert?.id]);

  useEffect(() => {
    if (!alert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissActiveAlert(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alert?.id]);

  const title = alert?.title?.trim() || (alert ? defaultTitleForVariant(alert.variant) : "");

  return (
    <AnimatePresence>
      {alert ? (
        <motion.div
          key={alert.id}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm"
          data-testid="app-alert-backdrop"
          onClick={() => dismissActiveAlert(false)}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-alert-title"
            aria-describedby="app-alert-message"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200/80 overflow-hidden"
            data-testid="app-alert"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className={`shrink-0 w-11 h-11 rounded-xl ring-1 flex items-center justify-center ${variantAccent(alert.variant)}`}
                >
                  <VariantIcon variant={alert.variant} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 id="app-alert-title" className="text-lg font-bold text-neutral-900 tracking-tight">
                    {title}
                  </h2>
                  <p id="app-alert-message" className="mt-2 text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                    {alert.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="shrink-0 p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                onClick={() => dismissActiveAlert(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-5 mt-2 bg-neutral-50/80 border-t border-neutral-100">
              {alert.kind === "confirm" ? (
                <button
                  type="button"
                  data-testid="app-alert-cancel"
                  className="inline-flex justify-center items-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  onClick={() => dismissActiveAlert(false)}
                >
                  {alert.cancelLabel}
                </button>
              ) : null}
              <button
                ref={primaryRef}
                type="button"
                data-testid={alert.kind === "confirm" ? "app-alert-confirm" : "app-alert-ok"}
                className="inline-flex justify-center items-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 transition-colors shadow-sm"
                onClick={() => dismissActiveAlert(true)}
              >
                {alert.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
