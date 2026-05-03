"use client";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isDark?: boolean;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isDark = true,
  className,
}: DateRangePickerProps) {
  const inputClass = cn(
    "rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
    isDark
      ? "border-slate-700 bg-slate-900 text-slate-100"
      : "border-slate-300 bg-white text-slate-900"
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className={inputClass}
        dir="ltr"
      />
      <span className={isDark ? "text-slate-400" : "text-slate-500"}>-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className={inputClass}
        dir="ltr"
      />
    </div>
  );
}
