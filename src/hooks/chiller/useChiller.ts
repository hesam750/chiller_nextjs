// src/hooks/useChiller.ts
import { useState, useCallback } from 'react';

export interface ChillerState {
  id: string;
  power: boolean;
  fan: boolean;
  setpoint: number;
  currentTemp: number;
  schedule: { start: string; stop: string };
  lastCommandTime: string;
  // ...
}

export const useChiller = (initialData: ChillerState) => {
  const [chiller, setChiller] = useState<ChillerState>(initialData);

  const togglePower = useCallback(() => {
    setChiller(prev => ({ ...prev, power: !prev.power }));
  }, []);

  const incSetpoint = useCallback(() => {
    setChiller(prev => ({ ...prev, setpoint: prev.setpoint + 1 }));
  }, []);

  const decSetpoint = useCallback(() => {
    setChiller(prev => ({ ...prev, setpoint: prev.setpoint - 1 }));
  }, []);

  const applySetpoint = useCallback(async (newSetpoint: number) => {
    // call API
    setChiller(prev => ({ ...prev, setpoint: newSetpoint }));
  }, []);

  // ... بقیه توابع

  return {
    chiller,
    togglePower,
    incSetpoint,
    decSetpoint,
    applySetpoint,
  };
};
