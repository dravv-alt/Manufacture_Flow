"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { OperationsContext, initialOperationsState, type OperationsState, type WorkflowCommand, type DemoScenarioId, type StoryMode } from "./OperationsContext";
import { applyDemoCommand, createDemoWorkflow, DEMO_STORAGE_KEY, readDemoWorkflow, type DemoWorkflow } from "./demo-workflow";
import { demoOperationsSnapshot } from "@/demo-data/operations";

export function DemoOperationsProvider({ children }: { children: ReactNode }) {
  const [workflow, setWorkflow] = useState<DemoWorkflow>(() => createDemoWorkflow(initialOperationsState));
  const current = useRef(workflow);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<WorkflowCommand["type"] | null>(null);
  const [scenario, setScenario] = useState<DemoScenarioId>("local-spare");
  const [storyMode, setStoryMode] = useState<StoryMode>("manual");
  const commit = (next: DemoWorkflow) => {
    // Save before publishing success. Storage failure must never look like a durable command.
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
    current.current = next; setWorkflow(next); setError(null);
  };
  useEffect(() => {
    try { const saved = localStorage.getItem(DEMO_STORAGE_KEY); if (saved) { const next = readDemoWorkflow(saved); current.current = next; setWorkflow(next); } else localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(current.current)); }
    catch (e) { setError(e instanceof Error ? e.message : "Browser storage is unavailable."); }
    setReady(true);
    const sync = (event: StorageEvent) => { if (event.key === DEMO_STORAGE_KEY && event.newValue) { try { const next = readDemoWorkflow(event.newValue); current.current = next; setWorkflow(next); } catch { setError("Another tab wrote an incompatible demo. Reset to recover."); } } };
    window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync);
  }, []);
  const update = (patch: Partial<OperationsState>) => {
    try { const next = structuredClone(current.current); next.state = { ...next.state, ...patch }; next.snapshot.maintenanceWorkOrders[0].assignee = next.state.maintenanceAssignee; next.message = "Demo preferences updated and saved."; commit(next); }
    catch { setError("Unable to save changes in browser storage. Check browser storage permissions."); }
  };
  const runWorkflowCommand = async (command: WorkflowCommand) => {
    if (!ready) { setError("Restoring saved demo. Please try again shortly."); return false; }
    setPending(command.type);
    try { commit(applyDemoCommand(current.current, command)); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Action failed; no changes were saved."); return false; }
    finally { setPending(null); }
  };
  const resetDemo = async (nextScenario: DemoScenarioId = scenario) => {
    try { const next = createDemoWorkflow(initialOperationsState); if (nextScenario === "golden") { next.snapshot.inventory[0].onHand = 2; next.state.inventoryAvailable = false; next.state.inventoryState = "unavailable"; next.state.recoveryScenario = "vendor"; next.snapshot.maintenanceWorkOrders[0].scenario = "vendor"; } commit(next); setScenario(nextScenario); return true; }
    catch { setError("Could not save a fresh demo. Browser storage is unavailable."); return false; }
  };
  const { state, snapshot } = workflow;
  const data = { ...demoOperationsSnapshot, failures: demoOperationsSnapshot.failures.filter(f => f.id !== snapshot.failureCase.externalId || snapshot.failureCase.workflowState !== "resolved"), workstations: demoOperationsSnapshot.workstations.map(w => w.id === "WS-102" ? { ...w, status: snapshot.workstation!.status as typeof w.status, capacity: state.routingOutcome === "executed" ? 0 : 35 } : w.id === "WS-105" ? { ...w, capacity: state.routingOutcome === "executed" ? 80 : 45 } : w) };
  if (!ready) return <div role="status" className="p-8">Restoring your saved demo workflow…</div>;
  return <OperationsContext.Provider value={{ state, data, overview: null, activeCase: snapshot, currentCaseId: snapshot.failureCase.externalId, runtime: "demo", demoScenario: scenario, storyMode, runtimeBusy: false, backendError: null, realtimeConnected: false, update, reset: () => { void resetDemo(); }, refresh: async () => { try { const saved = localStorage.getItem(DEMO_STORAGE_KEY); if (saved) { const next = readDemoWorkflow(saved); current.current = next; setWorkflow(next); } } catch { setError("Unable to reload the saved demo."); } }, runWorkflowCommand, pendingCommand: pending, commandError: error, clearCommandError: () => setError(null), currentUser: null, signOut: async () => { setError("This is a local simulation; there is no authenticated session to sign out of."); }, enterDemo: async (s, mode) => { setStoryMode(mode); return resetDemo(s); }, resetDemo, triggerDemo: async () => { setError(null); return true; }, exitDemo: async () => { setStoryMode("manual"); } }}>
    {children}
  </OperationsContext.Provider>;
}
