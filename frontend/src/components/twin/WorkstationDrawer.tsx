"use client";

/**
 * REDUNDANT — replaced by TwinWorkspace's workstation and component inspector.
 * Retained intact for review; do not import into active routes.
 */

import { useState, useEffect } from "react";
import { Workstation } from "@/data/workstations";

interface DrawerProps {
  workstation: Workstation | null;
  onClose: () => void;
  onAddMaintenanceLog: (wsId: string, logText: string) => void;
}

export default function WorkstationDrawer({ workstation, onClose, onAddMaintenanceLog }: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !workstation) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-[450px] bg-surface-container-lowest border-l border-outline-variant/30 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-headline-md font-bold text-primary">{workstation.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  workstation.status === 'At Risk' ? 'bg-error/10 text-error border border-error/30' :
                  workstation.status === 'Under Maintenance' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                  'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                }`}>
                  {workstation.status.toUpperCase()}
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant mt-0.5">{workstation.name} • Line {workstation.line}</p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-variant flex items-center justify-center text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* C.2 Prediction Card */}
          {workstation.failureProb > 20 && (
            <div className="bg-error-container/30 border border-error/20 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-label-caps text-label-caps text-on-error-container font-bold">Failure Risk Assessment</span>
                <span className="bg-error text-on-error px-2 py-0.5 rounded-full font-label-caps text-[10px]">
                  {workstation.failureProb}% HIGH CONFIDENCE
                </span>
              </div>
              <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden mb-3">
                <div className="bg-error h-full rounded-full transition-all duration-500" style={{ width: `${workstation.failureProb}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-on-surface-variant">Predicted Component:</span>
                  <p className="font-bold text-primary">{workstation.predictedComponent}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant">Est. Time to Failure:</span>
                  <p className="font-bold text-error">{workstation.estimatedTTF}</p>
                </div>
              </div>
            </div>
          )}

          {/* Live Telemetry Gauges */}
          <div className="mb-6">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-3">Live Telemetry Metrics</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20 text-center">
                <span className="text-xs text-on-surface-variant block">Temp</span>
                <span className={`font-bold text-base ${workstation.temperature > 80 ? 'text-error' : 'text-primary'}`}>
                  {workstation.temperature}°C
                </span>
              </div>
              <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20 text-center">
                <span className="text-xs text-on-surface-variant block">Vibration</span>
                <span className={`font-bold text-base ${workstation.vibration > 3.5 ? 'text-error' : 'text-primary'}`}>
                  {workstation.vibration} mm/s
                </span>
              </div>
              <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20 text-center">
                <span className="text-xs text-on-surface-variant block">Capacity</span>
                <span className="font-bold text-base text-primary">{workstation.capacity}%</span>
              </div>
            </div>
          </div>

          {/* C.4 Recent Machine Logs */}
          <div className="mb-6">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-3">Recent Machine Logs</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {workstation.eventLogs.length > 0 ? (
                workstation.eventLogs.map((log, idx) => (
                  <div key={idx} className="text-xs p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/10 flex items-start gap-2">
                    <span className={`material-symbols-outlined text-sm mt-0.5 ${
                      log.type === 'error' ? 'text-error' : log.type === 'warn' ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {log.type === 'error' ? 'error' : log.type === 'warn' ? 'warning' : 'info'}
                    </span>
                    <div>
                      <span className="font-mono text-on-surface-variant text-[10px]">{log.time}</span>
                      <p className="text-primary font-medium">{log.event}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic">No recent log events recorded.</p>
              )}
            </div>
          </div>

          {/* C.5 Maintenance History (Gap 1 & Gap 2) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-label-caps text-label-caps text-on-surface-variant">Maintenance History</h4>
              <button 
                onClick={() => {
                  const input = prompt(`Log manual maintenance action for ${workstation.id}:`);
                  if (input) onAddMaintenanceLog(workstation.id, input);
                }}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Log Action
              </button>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {workstation.historyLogs.map((log, idx) => (
                <div key={idx} className="text-xs p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/10 flex justify-between items-center">
                  <span className="text-primary">{log.description}</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">{log.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-outline-variant/20 flex gap-3">
          {workstation.activeCaseId ? (
            <a 
              href={`/failure/${workstation.activeCaseId}`}
              className="flex-1 bg-primary text-on-primary py-3 rounded-full font-label-caps text-label-caps text-center hover:bg-inverse-surface transition-colors"
            >
              View Active Failure Case →
            </a>
          ) : (
            <button 
              disabled
              className="flex-1 bg-surface-variant text-on-surface-variant py-3 rounded-full font-label-caps text-label-caps text-center opacity-60"
            >
              No Active Failure Case
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
