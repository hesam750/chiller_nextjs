"use client";

import { useMemo, useState, useCallback } from "react";
import { WithAccess } from "../_components/rbac";
import { useI18n } from "@/app/_components/i18n";

// Admin hooks
import {
  useAdminAuth,
  useAdminChillers,
  useAdminUsers,
  useAdminActivity,
  useAdminPowerLogs,
  useAdminTheme,
  useAdminToast,
} from "@/hooks/admin";

// Admin components
import { AdminChillerStats } from "./_components/AdminChillerStats";
import { AdminAddChillerSection } from "./_components/AdminAddChillerSection";
import { ChillerCard } from "./_components/ChillerCard";
import { LogsPanel } from "./_components/LogsPanel";
import { AdminPdgPanel } from "./_components/AdminPdgPanel";
import { AdminTabsModal } from "./_components/AdminTabsModal";
import { AdminHeader } from "./_components/AdminHeader";
import { AdminToast } from "./_components/AdminToast";
import { ActivityPanel, ActivityModal } from "./_components/ActivityPanel";
import { UsersModal } from "./_components/UsersModal";
import { PdgModal } from "./_components/PdgModal";

type PdgItem = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
  url: string;
};

export default function AdminPage() {
  const { t } = useI18n();
  
  // Theme & Toast
  const { theme, toggleTheme } = useAdminTheme();
  const { toast, toastVisible, showToast } = useAdminToast();

  // Auth & Permissions
  const { role, mePermissions, canEditChillers } = useAdminAuth();

  // Chillers
  const {
    chillers,
    setChillers,
    loading: chillersLoading,
    msg,
    progressOnSeconds,
    progressOffSeconds,
    progressByChiller,
    setProgressByChiller,
    reload,
    handleAdd: handleAddChiller,
    handleSave,
    handleDelete,
    handleSaveProgressForChiller,
  } = useAdminChillers({ showToast, canEditChillers });

  // Users
  const {
    users,
    setUsers,
    userSearch,
    setUserSearch,
    usersModalOpen,
    setUsersModalOpen,
    filteredUsers,
  } = useAdminUsers({ role, showToast });

  // Activity logs
  const {
    activityLogs,
    activityUserFilter,
    setActivityUserFilter,
    activityLoading,
    activityLimit,
    setActivityLimit,
    activityModalOpen,
    setActivityModalOpen,
  } = useAdminActivity({ role });

  // Power logs
  const { powerSessions, now } = useAdminPowerLogs({ mePermissions });

  // Modal states
  const [pdgModalOpen, setPdgModalOpen] = useState(false);
  const [manageTabsModalOpen, setManageTabsModalOpen] = useState(false);

  // Form state for adding chillers
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [active, setActive] = useState(true);

  // PDG items derived from chillers
  const pdgs: PdgItem[] = useMemo(() => 
    chillers.map((c) => {
      const baseIp = (c.ip || "").trim().replace(/\/+$/, "");
      return {
        id: c.id,
        name: c.name,
        ip: baseIp,
        active: c.active,
        url: `http://${baseIp}/pdg.index`,
      };
    }), [chillers]);

  const handleOpenPdg = useCallback((item: PdgItem) => {
    if (!item.ip) return;
    if (typeof window !== "undefined") {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleDeletePdg = useCallback(async (id: string) => {
    if (!canEditChillers) {
      showToast(t("no.access.deletePdg"), "error");
      return;
    }
    const m = await import("@/lib/services/chillers");
    const ok = await m.deleteChiller(id);
    if (!ok) {
      showToast(t("err.deletePdg"), "error");
      return;
    }
    setChillers((prev) => prev.filter((x) => x.id !== id));
    showToast(t("ok.pdg.deleted"), "success");
  }, [canEditChillers, t, showToast, setChillers]);

  const handleAddPdg = useCallback(async (pdgName: string, pdgIp: string) => {
    if (!canEditChillers) {
      showToast(t("no.access.addPdg"), "error");
      return;
    }
    if (!pdgName.trim() || !pdgIp.trim()) {
      showToast(t("err.pdg.input"), "error");
      return;
    }
    const m = await import("@/lib/services/chillers");
    const item = await m.addChiller({ name: pdgName, ip: pdgIp, active: true });
    if (!item) {
      showToast(t("err.addPdg"), "error");
      return;
    }
    setChillers((prev) => [...prev, item]);
    showToast(t("ok.pdg.added"), "success");
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
  }, [canEditChillers, t, showToast, setChillers, progressOnSeconds, progressOffSeconds, setProgressByChiller]);

  const handleAdd = useCallback(async () => {
    const item = await handleAddChiller(name, ip, active);
    if (item) {
      setName("");
      setIp("");
      setActive(true);
    }
  }, [handleAddChiller, name, ip, active]);

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-[#020617] text-slate-50"
          : "min-h-screen bg-[#f7f9fc] text-[#1f2937]"
      }
    >
      <AdminHeader
        theme={theme}
        role={role}
        onToggleTheme={toggleTheme}
        onOpenUsersModal={() => setUsersModalOpen(true)}
        onOpenTabsModal={() => setManageTabsModalOpen(true)}
      />

      <main className="px-4 py-4 space-y-4">
        {/* Stats */}
        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <WithAccess
            anyRoles={["admin", "manager"]}
            loadingFallback={
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow animate-pulse"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow animate-pulse"
                }
              >
                <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
                <div className="h-6 w-16 bg-slate-700 rounded" />
              </div>
            }
          >
            <AdminChillerStats
              theme={theme}
              total={chillers.length}
              activeCount={chillers.filter((c) => c.active).length}
            />
          </WithAccess>
        </section>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Add Chiller Section */}
          <WithAccess
            anyRoles={["admin"]}
            anyPerms={["canAddPackage"]}
            loadingFallback={
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow animate-pulse"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow animate-pulse"
                }
              >
                <div className="h-4 w-36 bg-slate-700 rounded mb-2" />
                <div className="h-8 w-full bg-slate-700 rounded" />
              </div>
            }
          >
            <AdminAddChillerSection
              theme={theme}
              canEditChillers={canEditChillers}
              msg={msg}
              name={name}
              ip={ip}
              active={active}
              onChangeName={setName}
              onChangeIp={setIp}
              onChangeActive={setActive}
              onAdd={handleAdd}
              onReload={reload}
            />
          </WithAccess>

          {/* Chillers Grid & Logs */}
          <section className="lg:col-span-12 mt-4 grid gap-4 two-col-lg-grid">
            <WithAccess
              anyRoles={["admin", "manager"]}
              anyPerms={["canViewChillers"]}
              loadingFallback={
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={
                        theme === "dark"
                          ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow animate-pulse"
                          : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow animate-pulse"
                      }
                    >
                      <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
                      <div className="h-4 w-36 bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              }
            >
              <div>
                <h4 className="mb-3 text-sm font-semibold">{t("chillers")}</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {chillers.map((c) => (
                    <ChillerCard
                      key={c.id}
                      theme={theme}
                      chiller={c}
                      canEditChillers={canEditChillers}
                      progressDefaultOn={progressOnSeconds}
                      progressDefaultOff={progressOffSeconds}
                      progress={progressByChiller[c.id] || null}
                      onChangeChiller={(id, patch) =>
                        setChillers((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
                      }
                      onChangeProgress={(id, next) =>
                        setProgressByChiller((prev) => ({
                          ...prev,
                          [id]: {
                            progressOnSeconds: next.progressOnSeconds,
                            progressOffSeconds: next.progressOffSeconds,
                          },
                        }))
                      }
                      onSave={handleSave}
                      onDelete={handleDelete}
                      onSaveProgress={handleSaveProgressForChiller}
                    />
                  ))}
                </div>
              </div>
            </WithAccess>

            <WithAccess
              anyPerms={["canViewLogs"]}
              loadingFallback={
                <aside
                  className={
                    theme === "dark"
                      ? "rounded-2xl border border-slate-800 bg-slate-950 shadow-lg p-4 animate-pulse"
                      : "rounded-2xl border border-slate-200 bg-slate-100 shadow-lg p-4 animate-pulse"
                  }
                >
                  <div className="h-4 w-24 bg-slate-700 rounded mb-3" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-full bg-slate-700/60 rounded" />
                    ))}
                  </div>
                </aside>
              }
            >
              <LogsPanel theme={theme} sessions={powerSessions} now={now} />
            </WithAccess>
          </section>
        </div>

        {/* PDG Panel */}
        <WithAccess anyRoles={["admin", "manager"]} anyPerms={["canViewPdgs"]}>
          <section
            className={
              theme === "dark"
                ? "mt-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl px-4 py-4"
                : "mt-4 rounded-2xl border border-[#e6edf7] bg-[#fbfcff] shadow-xl px-4 py-4"
            }
          >
            <AdminPdgPanel
              theme={theme}
              pdgs={pdgs}
              canEditChillers={canEditChillers}
              onAddClick={() => setPdgModalOpen(true)}
              onOpenPdg={handleOpenPdg}
              onDeletePdg={handleDeletePdg}
            />
          </section>
        </WithAccess>

        {/* Activity Panel */}
        <WithAccess anyRoles={["admin", "manager"]} anyPerms={["canViewUserActivity"]}>
          <ActivityPanel
            theme={theme}
            activityLogs={activityLogs}
            activityLoading={activityLoading}
            onShowMore={() => {
              setActivityLimit(2000);
              setActivityModalOpen(true);
            }}
          />
        </WithAccess>
      </main>

      {/* Modals */}
      <AdminToast toast={toast} toastVisible={toastVisible} theme={theme} />
      
      <PdgModal
        theme={theme}
        isOpen={pdgModalOpen}
        onClose={() => setPdgModalOpen(false)}
        onAdd={handleAddPdg}
      />

      <UsersModal
        theme={theme}
        isOpen={usersModalOpen && role === "manager"}
        onClose={() => setUsersModalOpen(false)}
        users={users}
        setUsers={setUsers}
        filteredUsers={filteredUsers}
        userSearch={userSearch}
        setUserSearch={setUserSearch}
        showToast={showToast}
      />

      <ActivityModal
        theme={theme}
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        activityLogs={activityLogs}
        activityLoading={activityLoading}
        activityUserFilter={activityUserFilter}
        setActivityUserFilter={setActivityUserFilter}
        setActivityLimit={setActivityLimit}
      />

      {manageTabsModalOpen && (
        <AdminTabsModal 
          isOpen={manageTabsModalOpen} 
          onClose={() => setManageTabsModalOpen(false)} 
        />
      )}
    </div>
  );
}
