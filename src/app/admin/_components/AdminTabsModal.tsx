"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../_components/i18n";
import { TabItem } from "@/lib/db"; // Assuming TabItem is exported from db.ts

type AdminTabsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AdminTabsModal({ isOpen, onClose }: AdminTabsModalProps) {
  const { t } = useI18n();
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [newTabName, setNewTabName] = useState("");
  const [newTabActive, setNewTabActive] = useState(true);
  const [editingTab, setEditingTab] = useState<TabItem | null>(null);

  const fetchTabs = async () => {
    try {
      const res = await fetch("/api/tabs");
      if (!res.ok) throw new Error("Failed to fetch tabs");
      const data = await res.json();
      setTabs(data.items || []);
    } catch (error) {
      console.error("Error fetching tabs:", error);
      // TODO: Show a toast notification for error
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTabs();
    }
  }, [isOpen]);

  const handleAddTab = async () => {
    if (!newTabName.trim()) return;

    try {
      const res = await fetch("/api/tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTabName, active: newTabActive }),
      });
      if (!res.ok) throw new Error("Failed to add tab");
      await res.json();
      setNewTabName("");
      setNewTabActive(true);
      fetchTabs(); // Refresh the list
      // TODO: Show success toast
    } catch (error) {
      console.error("Error adding tab:", error);
      // TODO: Show error toast
    }
  };

  const handleUpdateTab = async (id: string) => {
    if (!editingTab || !editingTab.name.trim()) return;

    try {
      const res = await fetch(`/api/tabs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingTab.name, active: editingTab.active }),
      });
      if (!res.ok) throw new Error("Failed to update tab");
      await res.json();
      setEditingTab(null);
      fetchTabs(); // Refresh the list
      // TODO: Show success toast
    } catch (error) {
      console.error("Error updating tab:", error);
      // TODO: Show error toast
    }
  };

  const handleDeleteTab = async (id: string) => {
    if (!confirm(t("admin.tabs.confirmDelete"))) return; // Use translation for confirmation

    try {
      const res = await fetch(`/api/tabs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tab");
      fetchTabs(); // Refresh the list
      // TODO: Show success toast
    } catch (error) {
      console.error("Error deleting tab:", error);
      // TODO: Show error toast
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">{t("admin.tabs.manageTitle")}</h2>

        {/* Add New Tab Form */}
        <div className="mb-6 p-4 border rounded-md dark:border-gray-700">
          <h3 className="text-lg font-medium mb-3">{t("admin.tabs.addTab")}</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              type="text"
              placeholder={t("admin.tabs.tabNamePlaceholder")}
              className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={newTabActive}
                onChange={(e) => setNewTabActive(e.target.checked)}
              />
              <span className="label-text">{t("admin.tabs.active")}</span>
            </label>
            <button
              onClick={handleAddTab}
              className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
            >
              {t("admin.tabs.add")}
            </button>
          </div>
        </div>

        {/* List of Existing Tabs */}
        <div>
          <h3 className="text-lg font-medium mb-3">{t("admin.tabs.existingTabs")}</h3>
          {tabs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t("admin.tabs.noTabs")}</p>
          ) : (
            <ul className="space-y-2">
              {tabs.map((tab) => (
                <li
                  key={tab.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md dark:border-gray-700"
                >
                  {editingTab?.id === tab.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={editingTab.name}
                        onChange={(e) =>
                          setEditingTab({ ...editingTab, name: e.target.value })
                        }
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={editingTab.active}
                          onChange={(e) =>
                            setEditingTab({ ...editingTab, active: e.target.checked })
                          }
                        />
                        <span className="label-text">{t("admin.tabs.active")}</span>
                      </label>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={() => handleUpdateTab(tab.id)}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                        >
                          {t("admin.tabs.save")}
                        </button>
                        <button
                          onClick={() => setEditingTab(null)}
                          className="px-3 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-sm"
                        >
                          {t("admin.tabs.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2">
                        <span className={`font-medium ${!tab.active ? "text-gray-500 line-through" : ""}`}>
                          {tab.name}
                        </span>
                        {!tab.active && (
                          <span className="text-xs text-red-500">({t("admin.tabs.inactive")})</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={() => setEditingTab(tab)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          {t("admin.tabs.edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteTab(tab.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                          {t("admin.tabs.delete")}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          >
            {t("admin.tabs.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
