"use client";

import { Workstation } from "@/data/workstations";
import { AlertOctagon, Activity, ShieldAlert, Cpu } from "lucide-react";

interface NodeProps {
  workstations: Workstation[];
  onSelectWs: (ws: Workstation) => void;
}

export default function NodeTopologyGraph({ workstations, onSelectWs }: NodeProps) {
  const atRiskMachines = workstations.filter(w => w.status === 'At Risk');
  const activeAnomalies = workstations.filter(w => w.failureProb > 20).length;

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-white/40 dark:border-outline-variant/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] h-[430px] flex flex-col justify-between relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div>
          <h2 className="font-headline-md text-lg font-bold text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
            Plant Topology & Risk Matrix
          </h2>
          <p className="text-xs text-on-surface-variant">Real-time machine neural node telemetry</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-high/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold text-primary">Live Mesh</span>
        </div>
      </div>

      {/* Futuristic Topology Network Node Diagram */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4">
        <div className="relative w-full max-w-md h-52 flex items-center justify-center">
          
          {/* Connecting Orbital Rings */}
          <div className="absolute w-48 h-48 border border-dashed border-amber-500/30 rounded-full animate-[spin_30s_linear_infinite]"></div>
          <div className="absolute w-72 h-72 border border-dotted border-outline-variant/30 rounded-full animate-[spin_45s_linear_infinite_reverse]"></div>

          {/* Central Plant Core Node */}
          <div className="z-20 w-24 h-24 rounded-3xl bg-primary text-on-primary shadow-2xl flex flex-col items-center justify-center border-2 border-amber-400/50 hover:scale-105 transition-transform cursor-pointer">
            <Cpu className="w-6 h-6 text-amber-400 mb-1" />
            <span className="text-xs font-extrabold tracking-wider">PLANT CORE</span>
            <span className="text-[9px] text-amber-400 font-mono font-bold">{activeAnomalies} Alerts</span>
          </div>

          {/* Orbit Node 1: WS-108 Critical Node (Top Right) */}
          <div 
            onClick={() => {
              const ws = workstations.find(w => w.id === 'WS-108');
              if (ws) onSelectWs(ws);
            }}
            className="absolute -top-2 right-6 z-30 group/node cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 bg-error/20 rounded-2xl blur-md animate-ping"></div>
              <div className="w-16 h-16 rounded-2xl bg-error/90 backdrop-blur-md text-on-error flex flex-col items-center justify-center shadow-xl border border-white/30 group-hover/node:scale-110 transition-transform">
                <ShieldAlert className="w-4 h-4 mb-0.5" />
                <span className="font-bold text-xs">WS-108</span>
                <span className="text-[9px] font-mono opacity-90">68% Risk</span>
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/node:opacity-100 transition-opacity bg-primary text-on-primary text-[10px] p-2 rounded-xl whitespace-nowrap shadow-xl pointer-events-none">
              Actuator Joint B • TTF 36h
            </div>
          </div>

          {/* Orbit Node 2: WS-102 Critical Node (Bottom Left) */}
          <div 
            onClick={() => {
              const ws = workstations.find(w => w.id === 'WS-102');
              if (ws) onSelectWs(ws);
            }}
            className="absolute -bottom-2 left-6 z-30 group/node cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 bg-amber-500/20 rounded-2xl blur-md animate-pulse"></div>
              <div className="w-18 h-18 rounded-2xl bg-amber-400/95 backdrop-blur-md text-primary flex flex-col items-center justify-center shadow-xl border border-white/40 group-hover/node:scale-110 transition-transform">
                <AlertOctagon className="w-5 h-5 mb-0.5 text-error" />
                <span className="font-extrabold text-xs">WS-102</span>
                <span className="text-[9px] font-mono font-bold text-error">92% Risk</span>
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover/node:opacity-100 transition-opacity bg-primary text-on-primary text-[10px] p-2 rounded-xl whitespace-nowrap shadow-xl pointer-events-none z-40">
              Servo Motor Bearing • TTF 18h
            </div>
          </div>

          {/* Orbit Node 3: WS-112 Healthy Node (Top Left) */}
          <div 
            onClick={() => {
              const ws = workstations.find(w => w.id === 'WS-112');
              if (ws) onSelectWs(ws);
            }}
            className="absolute top-2 left-10 z-20 group/node cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/90 text-white flex flex-col items-center justify-center shadow-md border border-white/30 group-hover/node:scale-110 transition-transform">
              <span className="font-bold text-[10px]">WS-112</span>
              <span className="text-[8px] opacity-80">12%</span>
            </div>
          </div>

          {/* Orbit Node 4: WS-205 Healthy Node (Bottom Right) */}
          <div 
            onClick={() => {
              const ws = workstations.find(w => w.id === 'WS-205');
              if (ws) onSelectWs(ws);
            }}
            className="absolute bottom-4 right-12 z-20 group/node cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/90 text-white flex flex-col items-center justify-center shadow-md border border-white/30 group-hover/node:scale-110 transition-transform">
              <span className="font-bold text-[10px]">WS-205</span>
              <span className="text-[8px] opacity-80">8%</span>
            </div>
          </div>

        </div>
      </div>

      {/* Node Legend Bar */}
      <div className="relative z-10 flex items-center justify-between bg-surface-container-low/60 backdrop-blur-md p-3 rounded-2xl text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
          <span className="text-on-surface-variant font-medium">Critical Imminent ({atRiskMachines.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <span className="text-on-surface-variant font-medium">Degraded Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-on-surface-variant font-medium">Nominal Nodes</span>
        </div>
      </div>
    </div>
  );
}
