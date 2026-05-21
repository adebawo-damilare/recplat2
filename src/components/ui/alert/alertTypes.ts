export type AlertVariant = "info" | "success" | "warning" | "error";

export type AlertKind = "alert" | "confirm";

export type ActiveAlert = {
  id: string;
  kind: AlertKind;
  message: string;
  title?: string;
  variant: AlertVariant;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (confirmed: boolean) => void;
};

export type ShowAlertOptions = {
  message: string;
  title?: string;
  variant?: AlertVariant;
  confirmLabel?: string;
};

export type ShowConfirmOptions = {
  message: string;
  title?: string;
  variant?: AlertVariant;
  confirmLabel?: string;
  cancelLabel?: string;
};
