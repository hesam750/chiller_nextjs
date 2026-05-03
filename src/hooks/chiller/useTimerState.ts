import { useState } from 'react';

export function useTimerState() {
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerMode, setTimerMode] = useState<'on' | 'off'>('on');
  const [timerCreatedInSession, setTimerCreatedInSession] = useState(false);

  return {
    timerOpen,
    setTimerOpen,
    timerMode,
    setTimerMode,
    timerCreatedInSession,
    setTimerCreatedInSession,
  };
}
