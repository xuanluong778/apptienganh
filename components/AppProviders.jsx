"use client";

import { PaywallProvider } from "@/components/billing/PaywallProvider";

export default function AppProviders({ children }) {
  return <PaywallProvider>{children}</PaywallProvider>;
}
