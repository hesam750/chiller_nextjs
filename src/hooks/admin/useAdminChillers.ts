"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/_components/i18n";

export type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
};

export type ProgressSettings = {
  progressOnSeconds: number;
  progressOffSeconds: number;
};

interface UseAdminChillersOptions {
  showToast: (message: string, type: "success" | "error") => void;
  canEditChillers: boolean;
}

export function useAdminChillers({ showToast, canEditChillers }: UseAdminChillersOptions) {
  const { t } = useI18n();
  const [chillers, setChillers] = useState<Chiller[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [progressOnSeconds, setProgressOnSeconds] = useState(60);
  const [progressOffSeconds, setProgressOffSeconds] = useState(60);
  const [progressByChiller, setProgressByChiller] = useState<Record<string, ProgressSettings>>({});

  // Load chillers
  useEffect(() => {
    import("@/lib/services/chillers")
      .then((m) => m.fetchChillers())
      .then((items) => setChillers(items))
      .catch(() => {
        setMsg(t("err.list.fetch"));
        showToast(t("err.chillers.fetch"), "error");
      })
      .finally(() => setLoading(false));
  }, [t, showToast]);

  // Load global settings
  useEffect(() => {
    import("@/lib/services/settings")
      .then((m) => m.getGlobalSettings())
      .then((item) => {
        setProgressOnSeconds(item.progressOnSeconds);
        setProgressOffSeconds(item.progressOffSeconds);
      })
      .catch(() => undefined);
  }, []);

  // Load per-chiller settings
  useEffect(() => {
    if (!Array.isArray(chillers) || chillers.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        chillers.map(async (c) => {
          try {
            const m = await import("@/lib/services/settings");
            const item = await m.getSettingsForChiller(c.id);
            if (!item) return [c.id, null] as const;
            return [
              c.id,
              {
                progressOnSeconds: Math.max(1, Math.round(item.progressOnSeconds)),
                progressOffSeconds: Math.max(1, Math.round(item.progressOffSeconds)),
              },
            ] as const;
          } catch {
            return [c.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const next: Record<string, ProgressSettings> = {};
      for (const [id, val] of entries) {
        if (val) next[id] = val;
      }
      setProgressByChiller(next);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [chillers]);

  const reload = useCallback(() => {
    import("@/lib/services/chillers")
      .then((m) => m.fetchChillers())
      .then((items) => setChillers(items))
      .catch(() => {
        setMsg(t("err.list.fetch"));
        showToast(t("err.chillers.fetch"), "error");
      });
  }, [t, showToast]);

  const handleAdd = useCallback(
    async (name: string, ip: string, active: boolean) => {
      if (!canEditChillers) {
        showToast(t("no.access.addChiller"), "error");
        return null;
      }
      setMsg(t("loading.adding"));
      const m = await import("@/lib/services/chillers");
      const item = await m.addChiller({ name, ip, active });
      if (!item) {
        setMsg(t("err.addChiller"));
        showToast(t("err.addChiller"), "error");
        return null;
      }
      setChillers((prev) => [...prev, item]);
      setMsg(t("ok.chiller.added"));
      showToast(t("ok.chiller.added"), "success");
      
      try {
        const m2 = await import("@/lib/services/settings");
        const res2 = await m2.updateChillerSettings({
          chillerId: item.id,
          progressOnSeconds: Math.max(1, Math.round(progressOnSeconds)),
          progressOffSeconds: Math.max(1, Math.round(progressOffSeconds)),
        });
        if (res2 && typeof res2.progressOnSeconds === "number" && typeof res2.progressOffSeconds === "number") {
          setProgressByChiller((prev) => ({
            ...prev,
            [item.id]: {
              progressOnSeconds: res2.progressOnSeconds,
              progressOffSeconds: res2.progressOffSeconds,
            },
          }));
        }
      } catch {
        // ignore
      }
      return item;
    },
    [canEditChillers, progressOnSeconds, progressOffSeconds, t, showToast]
  );

  const handleSave = useCallback(
    async (c: Chiller) => {
      if (!canEditChillers) {
        showToast(t("no.access.editChiller"), "error");
        return;
      }
      setMsg(t("loading.saving"));
      const m = await import("@/lib/services/chillers");
      const ok = await m.updateChiller(c.id, { name: c.name, ip: c.ip, active: c.active });
      if (!ok) {
        setMsg(t("err.saveChiller"));
        showToast(t("err.saveChiller"), "error");
        return;
      }
      setMsg(t("ok.chiller.saved"));
      showToast(t("ok.chiller.saved"), "success");
    },
    [canEditChillers, t, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!canEditChillers) {
        showToast(t("no.access.deleteChiller"), "error");
        return;
      }
      const m = await import("@/lib/services/chillers");
      const ok = await m.deleteChiller(id);
      if (!ok) {
        setMsg(t("err.deleteChiller"));
        showToast(t("err.deleteChiller"), "error");
        return;
      }
      setChillers((prev) => prev.filter((x) => x.id !== id));
      setMsg(t("ok.chiller.deleted"));
      showToast(t("ok.chiller.deleted"), "success");
    },
    [canEditChillers, t, showToast]
  );

  const handleSaveProgressForChiller = useCallback(
    async (c: Chiller) => {
      if (!canEditChillers) {
        showToast(t("no.access.editChillerSettings"), "error");
        return;
      }
      const cur = progressByChiller[c.id] || {
        progressOnSeconds,
        progressOffSeconds,
      };
      const m = await import("@/lib/services/settings");
      const res = await m.updateChillerSettings({
        chillerId: c.id,
        progressOnSeconds: Math.max(1, Math.round(cur.progressOnSeconds)),
        progressOffSeconds: Math.max(1, Math.round(cur.progressOffSeconds)),
      });
      if (!res) {
        showToast(t("err.progress.save"), "error");
        return;
      }
      if (res && typeof res.progressOnSeconds === "number" && typeof res.progressOffSeconds === "number") {
        setProgressByChiller((prev) => ({
          ...prev,
          [c.id]: {
            progressOnSeconds: res.progressOnSeconds,
            progressOffSeconds: res.progressOffSeconds,
          },
        }));
        showToast(t("ok.progress.saved"), "success");
      } else {
        showToast(t("err.progress.invalidResponse"), "error");
      }
    },
    [canEditChillers, progressByChiller, progressOnSeconds, progressOffSeconds, t, showToast]
  );

  return {
    chillers,
    setChillers,
    loading,
    msg,
    progressOnSeconds,
    progressOffSeconds,
    progressByChiller,
    setProgressByChiller,
    reload,
    handleAdd,
    handleSave,
    handleDelete,
    handleSaveProgressForChiller,
  };
}
