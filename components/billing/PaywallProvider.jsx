"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const PaywallModal = dynamic(() => import("./PaywallModal"), { ssr: false });

const PaywallContext = createContext(null);

export function PaywallProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");

  const openPaywall = useCallback((input) => {
    if (typeof input === "string") {
      setMessage(input || "");
      setSource("");
    } else if (input && typeof input === "object") {
      setMessage(typeof input.message === "string" ? input.message : "");
      setSource(typeof input.source === "string" ? input.source : "");
    } else {
      setMessage("");
      setSource("");
    }
    setOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setOpen(false);
    setMessage("");
    setSource("");
  }, []);

  const value = useMemo(() => ({ openPaywall, closePaywall }), [openPaywall, closePaywall]);

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallModal open={open} onClose={closePaywall} message={message} source={source} />
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) {
    return {
      openPaywall: () => {},
      closePaywall: () => {},
    };
  }
  return ctx;
}
