"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "@/app/_components/i18n";
import type { Role } from "./useAdminAuth";

export type User = {
  username: string;
  role: "admin" | "manager" | "viewer";
  active: boolean;
  permissions?: Record<string, boolean>;
};

interface UseAdminUsersOptions {
  role: Role;
  showToast: (message: string, type: "success" | "error") => void;
}

export function useAdminUsers({ role, showToast }: UseAdminUsersOptions) {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  // Load users
  useEffect(() => {
    if (!(role === "manager" || role === "admin")) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((j) => setUsers(Array.isArray(j.items) ? j.items : []))
      .catch(() => undefined);
  }, [role]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const t1 = (u.username || "").toLowerCase();
      const t2 = (u.role || "").toLowerCase();
      return t1.includes(q) || t2.includes(q);
    });
  }, [users, userSearch]);

  const handleDeactivateUser = useCallback(
    async (u: User) => {
      if (!(role === "manager" || role === "admin")) {
        showToast(t("no.access.deactivateUser"), "error");
        return;
      }
      if (!u.active) return;
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u.username, active: false }),
      });
      if (!res.ok) {
        showToast(t("err.user.deactivate"), "error");
        return;
      }
      setUsers((prev) => prev.map((x) => (x.username === u.username ? { ...x, active: false } : x)));
      showToast(t("ok.user.deactivated"), "success");
    },
    [role, t, showToast]
  );

  return {
    users,
    setUsers,
    userSearch,
    setUserSearch,
    usersModalOpen,
    setUsersModalOpen,
    filteredUsers,
    handleDeactivateUser,
  };
}
