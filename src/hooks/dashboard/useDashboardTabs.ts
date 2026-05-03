import { useState, useEffect, useMemo } from "react";
import type { Chiller } from "@/lib/chillers";
import type { TabItem } from "@/lib/db";

export function useDashboardTabs(chillers: Chiller[]) {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await fetch("/api/tabs");
        if (!res.ok) throw new Error("Failed to fetch tabs");
        const data = await res.json();
        const fetchedTabs: TabItem[] = data.items || [];
        setTabs(fetchedTabs);
        const firstActiveTab = fetchedTabs.find(tab => tab.active);
        if (firstActiveTab) setSelectedTabId(firstActiveTab.id);
      } catch (error) {
        console.error("Error fetching dashboard tabs:", error);
      }
    };
    fetchTabs();
  }, []);

  const filteredChillers = useMemo(() => {
    if (!selectedTabId) return chillers;
    const selectedTab = tabs.find(tab => tab.id === selectedTabId);
    if (!selectedTab) return chillers;
    return chillers.filter(chiller => selectedTab.chillerIds.includes(chiller.id));
  }, [chillers, selectedTabId, tabs]);

  return { tabs, selectedTabId, setSelectedTabId, filteredChillers };
}
