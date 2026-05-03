"use client";
import { useState, useCallback } from "react";

export type ToastType = "success" | "error";

export interface Toast {
  message: string;
  type: ToastType;
}

export function useAdminToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  }, []);

  return { toast, toastVisible, showToast };
}
