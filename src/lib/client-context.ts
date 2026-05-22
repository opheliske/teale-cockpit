"use client";

import { createContext, useContext } from "react";

export type ActiveClient = {
  clientId: string;
  clientName: string;
  color: string;
};

const ClientContext = createContext<ActiveClient | null>(null);

export const ClientContextProvider = ClientContext.Provider;

/**
 * The active client of the portal — the user's own company, or the company a
 * CSM is currently previewing. Provided by ClientGuard; available to every
 * route in the (client) group. Read it instead of the impersonation store so
 * the value is resolved through React state (no module-load race, no reload).
 */
export function useActiveClient(): ActiveClient {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error("useActiveClient must be used inside the client portal.");
  }
  return ctx;
}
