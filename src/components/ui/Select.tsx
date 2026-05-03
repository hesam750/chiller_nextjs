"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isDark?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, isDark = true, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
          isDark
            ? "border-slate-700 bg-slate-900 text-slate-100"
            : "border-slate-300 bg-white text-slate-900",
          className
        )}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";
