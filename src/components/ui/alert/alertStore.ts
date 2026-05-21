import type { ActiveAlert, AlertVariant, ShowAlertOptions, ShowConfirmOptions } from "./alertTypes";

let active: ActiveAlert | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeAlerts(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getActiveAlert(): ActiveAlert | null {
  return active;
}

export function getActiveAlertServerSnapshot(): ActiveAlert | null {
  return null;
}

function e2eSuppressesAlerts(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { __TALENTBRIDGE_E2E_NO_ALERTS?: boolean }).__TALENTBRIDGE_E2E_NO_ALERTS,
  );
}

function nextId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dismissActiveAlert(confirmed: boolean): void {
  if (!active) return;
  const { resolve } = active;
  active = null;
  emit();
  resolve(confirmed);
}

export function showAppAlert(options: ShowAlertOptions): Promise<void> {
  const message = options.message.trim();
  if (!message) return Promise.resolve();

  if (e2eSuppressesAlerts()) {
    console.info("[TalentBridge alert]", message);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    active = {
      id: nextId(),
      kind: "alert",
      message,
      title: options.title,
      variant: options.variant ?? "info",
      confirmLabel: options.confirmLabel ?? "OK",
      cancelLabel: "Cancel",
      resolve: () => resolve(),
    };
    emit();
  });
}

export function showAppConfirm(options: ShowConfirmOptions): Promise<boolean> {
  const message = options.message.trim();
  if (!message) return Promise.resolve(false);

  if (e2eSuppressesAlerts()) {
    console.info("[TalentBridge confirm]", message);
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    active = {
      id: nextId(),
      kind: "confirm",
      message,
      title: options.title,
      variant: options.variant ?? "warning",
      confirmLabel: options.confirmLabel ?? "Confirm",
      cancelLabel: options.cancelLabel ?? "Cancel",
      resolve,
    };
    emit();
  });
}

export function defaultTitleForVariant(variant: AlertVariant): string {
  switch (variant) {
    case "success":
      return "Success";
    case "error":
      return "Something went wrong";
    case "warning":
      return "Please confirm";
    default:
      return "Notice";
  }
}
