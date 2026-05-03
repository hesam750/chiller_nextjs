import { useState, useEffect, useCallback } from 'react';

type TimerData = {
  mode: 'on' | 'off';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type TimerSyncProps = {
  name: string;
  active: boolean;
  timerCreatedInSession: boolean;
};

export function useTimerSync({ name, active, timerCreatedInSession }: TimerSyncProps) {
  const [timerLoadedFromServer, setTimerLoadedFromServer] = useState(false);
  const [timerTarget, setTimerTarget] = useState<TimerData | null>(null);
  const [lastCmdAt, setLastCmdAt] = useState(0);

  // Load existing timer from server
  useEffect(() => {
    if (!active || timerCreatedInSession || timerLoadedFromServer) return;

    let mounted = true;

    const loadTimer = async () => {
      try {
        const res = await fetch(`/api/timers?unitName=${encodeURIComponent(name)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (mounted && data.timer) {
          setTimerTarget(data.timer);
          setTimerLoadedFromServer(true);
        }
      } catch (err) {
        console.error('Timer load error:', err);
      }
    };

    loadTimer();

    return () => {
      mounted = false;
    };
  }, [name, active, timerCreatedInSession, timerLoadedFromServer]);

  // Create timer
  const createTimer = useCallback(
    async (timer: TimerData) => {
      try {
        const res = await fetch('/api/timers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitName: name, timer }),
        });

        if (res.ok) {
          setTimerTarget(timer);
          setLastCmdAt(Date.now());
          return true;
        }
        return false;
      } catch (err) {
        console.error('Timer create error:', err);
        return false;
      }
    },
    [name]
  );

  // Delete timer
  const deleteTimer = useCallback(async () => {
    try {
      const res = await fetch(`/api/timers?unitName=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTimerTarget(null);
        setLastCmdAt(Date.now());
        return true;
      }
      return false;
    } catch (err) {
      console.error('Timer delete error:', err);
      return false;
    }
  }, [name]);

  return {
    timerTarget,
    timerLoadedFromServer,
    lastCmdAt,
    createTimer,
    deleteTimer,
  };
}
