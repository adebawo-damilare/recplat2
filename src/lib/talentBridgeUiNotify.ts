import type { AlertVariant } from "../components/ui/alert/alertTypes";
import { showAppAlert, showAppConfirm } from "../components/ui/alert/alertStore";

/**
 * User-visible notifications from client-only flows (apply, pipeline, etc.).
 * Renders a styled in-app dialog instead of `window.alert`.
 *
 * Playwright can set `window.__TALENTBRIDGE_E2E_NO_ALERTS = true` via `addInitScript`
 * so dialogs auto-resolve without blocking automation.
 */
export function talentBridgeUiNotify(message: string, variant: AlertVariant = "info"): void {
  if (typeof window === "undefined") return;
  void showAppAlert({ message, variant });
}

export function talentBridgeUiConfirm(
  message: string,
  options?: {
    title?: string;
    variant?: AlertVariant;
    confirmLabel?: string;
    cancelLabel?: string;
  },
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return showAppConfirm({
    message,
    title: options?.title,
    variant: options?.variant ?? "warning",
    confirmLabel: options?.confirmLabel,
    cancelLabel: options?.cancelLabel,
  });
}
