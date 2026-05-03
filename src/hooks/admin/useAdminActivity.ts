"use client";
import { useState, useEffect } from "react";
import type { Role } from "./useAdminAuth";

export type ActivityLog = {
  id: string;
  username: string;
  action: string;
  at: string;
  details?: Record<string, unknown>;
};

interface UseAdminActivityOptions {
  role: Role;
}

export function useAdminActivity({ role }: UseAdminActivityOptions) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityUserFilter, setActivityUserFilter] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLimit, setActivityLimit] = useState(50);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  // Load activity logs with filter
  useEffect(() => {
    setActivityLoading(true);
    const q = activityUserFilter.trim().length
      ? `/api/activity-log?username=${encodeURIComponent(activityUserFilter)}&limit=${activityLimit}`
      : `/api/activity-log?limit=${activityLimit}`;
    fetch(q)
      .then((r) => r.json())
      .then((j) => setActivityLogs(Array.isArray(j.items) ? j.items : []))
      .catch(() => undefined)
      .finally(() => setActivityLoading(false));
  }, [activityUserFilter, activityLimit]);

  // Initial load for managers/admins
  useEffect(() => {
    if (!(role === "manager" || role === "admin")) return;
    fetch("/api/activity-log")
      .then((r) => r.json())
      .then((j) => setActivityLogs(Array.isArray(j.items) ? j.items : []))
      .catch(() => undefined);
  }, [role]);

  return {
    activityLogs,
    activityUserFilter,
    setActivityUserFilter,
    activityLoading,
    activityLimit,
    setActivityLimit,
    activityModalOpen,
    setActivityModalOpen,
  };
}
