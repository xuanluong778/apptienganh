"use client";

import { PaywallProvider } from "@/components/billing/PaywallProvider";
import BeegoOnboardingGate from "@/components/onboarding/BeegoOnboardingGate";

export default function AppProviders({ children }) {
  return (
    <PaywallProvider>
      <BeegoOnboardingGate />
      {children}
    </PaywallProvider>
  );
}
