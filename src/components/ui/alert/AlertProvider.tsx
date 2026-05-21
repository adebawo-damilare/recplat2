"use client";

import { useSyncExternalStore } from "react";
import AppAlertDialog from "./AppAlertDialog";
import { getActiveAlert, getActiveAlertServerSnapshot, subscribeAlerts } from "./alertStore";

type AlertProviderProps = {
  children: React.ReactNode;
};

export default function AlertProvider({ children }: AlertProviderProps) {
  const active = useSyncExternalStore(subscribeAlerts, getActiveAlert, getActiveAlertServerSnapshot);

  return (
    <>
      {children}
      <AppAlertDialog alert={active} />
    </>
  );
}
