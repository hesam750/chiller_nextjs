"use client";
import type { Toast } from "@/hooks/admin/useAdminToast";
import type { Theme } from "@/hooks/admin/useAdminTheme";

interface AdminToastProps {
  toast: Toast | null;
  toastVisible: boolean;
  theme: Theme;
}

export function AdminToast({ toast, toastVisible, theme }: AdminToastProps) {
  if (!toast || !toastVisible) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm sm:text-base shadow-2xl z-50 max-w-[90%] sm:max-w-xl text-center ${
        toast.type === "success"
          ? theme === "dark"
            ? "bg-emerald-600 text-white"
            : "bg-emerald-500 text-white"
          : theme === "dark"
            ? "bg-red-600 text-white"
            : "bg-red-500 text-white"
      }`}
    >
      {toast.message}
    </div>
  );
}
