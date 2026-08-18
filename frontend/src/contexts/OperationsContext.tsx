"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { demoOperationsSnapshot, type DataCondition, type Role, type TwinMode } from "@/demo-data/operations";
import { demoOperationsDataProvider } from "@/demo-data/provider";
import type { ProcurementState, RecoveryScenarioId, ShipmentState } from "@/demo-data/ws102-scenario";
import { apiFetch } from "@/lib/api-client";

export type InventoryState = "available" | "unavailable" | "contention" | "stale" | "failed";
export type RoutingOutcome = "draft" | "approved" | "partial" | "no-compatible" | "stale" | "conflict";
export type WorkflowCommand =
  | { type: "reserve_part"; quantity: number }
  | { type: "approve_reroute" }
  | { type: "advance_maintenance"; expectedStage: number }
  | { type: "acknowledge_notification"; notificationId: string }
  | { type: "retry_notification"; notificationId: string }
  | { type: "set_procurement_state"; state: ProcurementState }
  | { type: "record_procurement_note"; note: string }
  | { type: "set_shipment_state"; state: ShipmentState };

export interface OperationsState {
  selectedWorkstationId: string;
  selectedComponentId: string;
  twinMode: TwinMode;
  role: Role;
  condition: DataCondition;
  allocationBlocked: boolean;
  inventoryState: InventoryState;
  inventoryAvailable: boolean;
  bearingReserved: boolean;
  rerouteTargetId: string;
  routingApproved: boolean;
  routingOutcome: RoutingOutcome;
  procurementState: ProcurementState;
  procurementNote: string;
  procurementNotes: string[];
  recoveryScenario: RecoveryScenarioId;
  maintenanceStage: number;
  maintenanceAssignee: string;
  shipmentState: ShipmentState;
  reducedMotion: boolean;
}
type AuthenticatedUser = { email: string; displayName: string; role: Role };

type Action = { type: "patch"; patch: Partial<OperationsState> } | { type: "reset" };

export const initialOperationsState: OperationsState = {
  selectedWorkstationId: "WS-102", selectedComponentId: "bearing", twinMode: "health", role: "Plant Manager", condition: "ready", allocationBlocked: true,
  inventoryState: "available", inventoryAvailable: true, bearingReserved: false, rerouteTargetId: "WS-105", routingApproved: false, routingOutcome: "draft",
  procurementState: "draft", procurementNote: "", procurementNotes: [], recoveryScenario: "local", maintenanceStage: 2,
  maintenanceAssignee: "A. Kulkarni / Maintenance Lead", shipmentState: "revised", reducedMotion: false,
};

type BackendActionResponse = { action: WorkflowCommand["type"]; workOrder?: { stage: number }; procurementRequest?: { state: ProcurementState }; procurementMessage?: { body: string }; shipmentImpact?: { state: string } };
type BackendCaseSnapshot = {
  inventory: Array<{ onHand: number; reserved: number; state: "available" | "unavailable" | "reserved" }>;
  reservations: Array<{ status: string }>;
  reroutePlans: Array<{ state: "draft" | "approved" | "executed" | "rejected" }>;
  maintenanceWorkOrders: Array<{ stage: number; assignee: string; scenario: RecoveryScenarioId }>;
  procurementRequests: Array<{ state: ProcurementState }>;
  procurementMessages: Array<{ kind: "system" | "internal_note" | "vendor"; body: string }>;
  shipmentImpacts: Array<{ state: "original" | "revised" | "notification_pending" | "notified" | "failed" }>;
};
type OperationsContextValue = {
  state: OperationsState;
  data: typeof demoOperationsSnapshot;
  update: (patch: Partial<OperationsState>) => void;
  reset: () => void;
  runWorkflowCommand: (command: WorkflowCommand) => Promise<boolean>;
  pendingCommand: WorkflowCommand["type"] | null;
  commandError: string | null;
  clearCommandError: () => void;
  currentUser: AuthenticatedUser | null;
  signOut: () => Promise<void>;
};

const OperationsContext = createContext<OperationsContextValue | null>(null);
function reducer(state: OperationsState, action: Action): OperationsState { return action.type === "reset" ? initialOperationsState : { ...state, ...action.patch }; }

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialOperationsState);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<WorkflowCommand["type"] | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    try { const stored = sessionStorage.getItem("machine-overwatch-state"); if (stored) dispatch({ type: "patch", patch: JSON.parse(stored) as Partial<OperationsState> }); }
    catch { /* A broken browser session must never stop the controlled workflow. */ }
    finally { setSessionRestored(true); }
  }, []);
  useEffect(() => { if (sessionRestored) sessionStorage.setItem("machine-overwatch-state", JSON.stringify(state)); }, [sessionRestored, state]);
  useEffect(() => { document.documentElement.dataset.reducedMotion = String(state.reducedMotion); }, [state.reducedMotion]);
  useEffect(() => {
    if (!sessionRestored) return;
    let active = true;
    void apiFetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ user: AuthenticatedUser | null }> : null)
      .then((session) => { if (active && session?.user) { setCurrentUser(session.user); dispatch({ type: "patch", patch: { role: session.user.role } }); } })
      .catch(() => { /* Local controlled read-only mode stays available when the API is offline. */ });
    void apiFetch("/api/failure-cases/FC-2026-0047", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<BackendCaseSnapshot> : null)
      .then((snapshot) => {
        if (!active || !snapshot) return;
        const inventory = snapshot.inventory[0];
        const reroute = snapshot.reroutePlans[0];
        const workOrder = snapshot.maintenanceWorkOrders[0];
        const procurement = snapshot.procurementRequests[0];
        const shipment = snapshot.shipmentImpacts[0];
        if (!inventory || !workOrder) return;
        dispatch({ type: "patch", patch: {
          bearingReserved: snapshot.reservations.some((reservation) => reservation.status === "active"),
          inventoryAvailable: inventory.onHand - inventory.reserved > 0,
          inventoryState: inventory.state === "reserved" ? "available" : inventory.state,
          routingApproved: reroute?.state === "approved" || reroute?.state === "executed",
          routingOutcome: reroute?.state === "approved" || reroute?.state === "executed" ? "approved" : "draft",
          maintenanceStage: workOrder.stage - 1,
          maintenanceAssignee: workOrder.assignee,
          recoveryScenario: workOrder.scenario,
          procurementState: procurement?.state ?? initialOperationsState.procurementState,
          procurementNotes: snapshot.procurementMessages.filter((message) => message.kind === "internal_note").map((message) => message.body),
          shipmentState: shipment?.state === "original" ? "no-impact" : shipment?.state === "notification_pending" ? "notification-pending" : shipment?.state ?? initialOperationsState.shipmentState,
        } });
      })
      .catch(() => { /* The controlled frontend remains usable if the local API is offline. */ });
    return () => { active = false; };
  }, [sessionRestored]);

  const update = (patch: Partial<OperationsState>) => dispatch({ type: "patch", patch });
  const runWorkflowCommand = async (command: WorkflowCommand) => {
    if (!currentUser) { setCommandError("Sign in to execute controlled workflow actions."); return false; }
    setPendingCommand(command.type); setCommandError(null);
    try {
      const response = await apiFetch("/api/failure-cases/FC-2026-0047/actions", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...command, actor: command.type === "advance_maintenance" ? state.maintenanceAssignee : state.role }),
      });
      const payload = await response.json() as BackendActionResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? (response.status === 401 ? "Your session has expired. Sign in again." : "The workflow command could not be completed."));
      if (payload.action === "reserve_part") update({ bearingReserved: true, inventoryState: "available", inventoryAvailable: true, recoveryScenario: "local" });
      if (payload.action === "approve_reroute") update({ routingApproved: true, routingOutcome: "approved" });
      if (payload.action === "advance_maintenance" && payload.workOrder) update({ maintenanceStage: payload.workOrder.stage - 1 });
      if (payload.action === "set_procurement_state" && payload.procurementRequest) update({ procurementState: payload.procurementRequest.state, recoveryScenario: payload.procurementRequest.state === "acknowledged" ? "vendor" : state.recoveryScenario });
      if (payload.action === "record_procurement_note" && payload.procurementMessage) update({ procurementNotes: [...state.procurementNotes, payload.procurementMessage.body], procurementNote: "" });
      if (payload.action === "set_shipment_state" && command.type === "set_shipment_state") update({ shipmentState: command.state });
      return true;
    } catch (error) { setCommandError(error instanceof Error ? error.message : "The workflow command could not be completed."); return false; }
    finally { setPendingCommand(null); }
  };

  const signOut = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCurrentUser(null);
    dispatch({ type: "patch", patch: { role: initialOperationsState.role } });
  };

  const value = useMemo(() => ({ state, data: demoOperationsDataProvider.getSnapshot(), update, reset: () => dispatch({ type: "reset" }), runWorkflowCommand, pendingCommand, commandError, clearCommandError: () => setCommandError(null), currentUser, signOut }), [state, pendingCommand, commandError, currentUser]);
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() { const context = useContext(OperationsContext); if (!context) throw new Error("useOperations must be used within OperationsProvider"); return context; }
