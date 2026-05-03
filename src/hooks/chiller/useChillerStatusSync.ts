import { useEffect } from 'react';

type StatusSyncProps = {
  ip: string;
  active: boolean;
  starting: boolean;
  onStatusUpdate: (data: {
    powerOn: boolean;
    fanOn: boolean;
    setpoint: number;
    tempCurrent: number | null;
    isOptimalMode: boolean;
  }) => void;
};

export function useChillerStatusSync({
  ip,
  active,
  starting,
  onStatusUpdate,
}: StatusSyncProps) {
  useEffect(() => {
    if (!ip || !active || starting) return;

    let mounted = true;
    const controller = new AbortController();

    const syncStatus = async () => {
      try {
        const res = await fetch('/api/chiller-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip }),
          signal: controller.signal,
        });

        if (!res.ok) return;
        const data = await res.json();

        if (mounted) {
          onStatusUpdate({
            powerOn: data.powerOn ?? false,
            fanOn: data.fanOn ?? false,
            setpoint: data.setpoint ?? 24,
            tempCurrent: data.tempCurrent ?? null,
            isOptimalMode: data.isOptimalMode ?? false,
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Status sync error:', err);
        }
      }
    };

    syncStatus();
    const interval = setInterval(syncStatus, 5000);

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [ip, active, starting, onStatusUpdate]);
}
