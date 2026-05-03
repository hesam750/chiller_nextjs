// src/hooks/dashboard/useToast.ts
import { useState, useCallback } from "react";

export interface ToastState {
  message: string;
  type: "success" | "error";
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  }, []);

  return { toast, toastVisible, showToast, setToastVisible };
}
