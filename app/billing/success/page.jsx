import { Suspense } from "react";
import BillingSuccessClient from "./BillingSuccessClient";

export const metadata = {
  title: "Payment successful",
  description: "Your subscription is confirmed.",
};

export const dynamic = "force-dynamic";

function Fallback() {
  return (
    <main
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontWeight: 700,
        color: "#1f4d8f",
      }}
    >
      Loading…
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <BillingSuccessClient />
    </Suspense>
  );
}
