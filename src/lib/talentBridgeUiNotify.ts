/**
 * User-visible notifications from client-only flows (apply, etc.).
 * Playwright can set `window.__TALENTBRIDGE_E2E_NO_ALERTS = true` via `addInitScript`
 * so `alert()` does not block the main thread during automated UI tests.
 */

function e2eSuppressesAlerts(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { __TALENTBRIDGE_E2E_NO_ALERTS?: boolean }).__TALENTBRIDGE_E2E_NO_ALERTS,
  );
}

export function talentBridgeUiNotify(message: string): void {
  if (typeof window === "undefined") return;
  if (e2eSuppressesAlerts()) {
    console.info("[TalentBridge]", message);
    return;
  }
  alert(message);
}
