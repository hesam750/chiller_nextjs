"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isDark?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isDark = true, disabled, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeClasses = {
      sm: "px-2.5 py-1 text-xs gap-1",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-3 text-base gap-2",
    };

    const variantClasses = {
      primary: isDark
        ? "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500"
        : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600",
      secondary: isDark
        ? "bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-slate-500"
        : "bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400",
      danger: isDark
        ? "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
        : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
      ghost: isDark
        ? "bg-transparent text-slate-100 hover:bg-slate-800 focus:ring-slate-500"
        : "bg-transparent text-slate-900 hover:bg-slate-100 focus:ring-slate-400",
      outline: isDark
        ? "border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800 focus:ring-slate-500"
        : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-400",
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
