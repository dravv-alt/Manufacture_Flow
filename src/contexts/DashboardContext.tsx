"use client";

// demo_data
import React, { createContext, useContext, useState, ReactNode } from 'react';

type SystemState = 'online' | 'warning' | 'critical' | 'offline';

interface MachineState {
  id: string;
  name: string;
  status: SystemState;
  predictedFailure: boolean;
  alertMessage?: string;
  throughput: number;
}

interface DashboardContextType {
  machines: MachineState[];
  setMachineStatus: (id: string, status: SystemState, alertMessage?: string) => void;
  oee: number;
}

const defaultMachines: MachineState[] = [
  {
    id: 'WS-102',
    name: 'Main Bearing Assembly',
    status: 'warning',
    predictedFailure: true,
    alertMessage: 'Vibration anomaly detected',
    throughput: 85,
  },
  {
    id: 'WS-103',
    name: 'Conveyor System A',
    status: 'online',
    predictedFailure: false,
    throughput: 100,
  }
];

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<MachineState[]>(defaultMachines);
  const [oee, setOee] = useState(87.4);

  const setMachineStatus = (id: string, status: SystemState, alertMessage?: string) => {
    setMachines(prev => prev.map(m => m.id === id ? { ...m, status, alertMessage } : m));
  };

  return (
    <DashboardContext.Provider value={{ machines, setMachineStatus, oee }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
