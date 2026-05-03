// src/components/ui/Toast.tsx
import type { ToastState } from "@/hooks/dashboard/useToast";

interface ToastProps {
  toast: ToastState | null;
  toastVisible: boolean;
  isDark: boolean;
}

export function Toast({ toast, toastVisible, isDark }: ToastProps) {
  if (!toast || !toastVisible) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm sm:text-base shadow-2xl z-50 max-w-[90%] sm:max-w-xl text-center transition-opacity duration-300 ${
        toast.type === "success"
          ? isDark
            ? "bg-emerald-600 text-white"
            : "bg-emerald-500 text-white"
          : isDark
            ? "bg-red-600 text-white"
            : "bg-red-500 text-white"
      }`}
    >
      {toast.message}
    </div>
  );
}
