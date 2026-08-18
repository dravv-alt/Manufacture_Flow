// demo_data
import { demoWorkstations } from "@/demo-data/workstations";
import { demoNotifications, demoRecoveryScenarios, demoReroutingAlternatives, demoReroutingJobs, demoShipmentSchedules, demoTwinComponentTree } from "@/demo-data/ws102-scenario";

export type Role = "Plant Manager" | "Production Supervisor" | "Maintenance Lead" | "Scheduler" | "Warehouse Team" | "Procurement Team" | "Logistics Team";
export type TwinMode = "health" | "flow" | "maintenance" | "isolate" | "dependencies";
export type DataCondition = "ready" | "loading" | "stale" | "empty" | "partial" | "failed";

export interface FailureCase { id: string; stationId: string; severity: "critical" | "warning"; component: string; partId: string; probability: number; ttfHours: number; detectedAt: string; state: string; owner: string; }
export interface CalendarEvent { id: string; date: string; workstationId: string; title: string; type: "completed" | "scheduled" | "critical"; details: string; }

export const demoFailureCases: readonly FailureCase[] = [
  { id: "FC-2026-0047", stationId: "WS-102", severity: "critical", component: "X-Axis Servo Motor Bearing", partId: "BRG-10023", probability: 92, ttfHours: 18, detectedAt: "10-Aug-2026 03:14 IST", state: "Recovery plan review", owner: "Production Supervisor" },
  { id: "FC-2026-0052", stationId: "WS-108", severity: "warning", component: "Actuator Joint B", partId: "ACT-2218", probability: 68, ttfHours: 36, detectedAt: "10-Aug-2026 04:05 IST", state: "Monitoring", owner: "Maintenance Lead" },
] as const;

export const demoCalendarEvents: readonly CalendarEvent[] = [
  { id: "ME-001", date: "2026-08-02", workstationId: "WS-105", title: "Preventive calibration", type: "completed", details: "Bearing lubrication and spindle alignment completed." },
  { id: "ME-002", date: "2026-08-10", workstationId: "WS-102", title: "Bearing replacement window", type: "critical", details: "WO-WS102-081 planned after BRG-10023 reservation." },
  { id: "ME-003", date: "2026-08-13", workstationId: "WS-108", title: "Actuator inspection", type: "scheduled", details: "Inspect Joint B harmonic oscillation." },
  { id: "ME-004", date: "2026-08-16", workstationId: "WS-112", title: "Belt tension check", type: "scheduled", details: "Quarterly conveyor drive inspection." },
] as const;

export const demoProcurementRequest = {
  id: "PR-10023-DRAFT", partId: "BRG-10023", partName: "Servo Motor Bearing", quantity: 1, requiredBy: "10-Aug-2026 06:00 IST", linkedCase: "FC-2026-0047", workOrderId: "WO-WS102-081", vendor: "Apex Motion Components", contact: "procurement@apexmotion.example", recipients: ["Procurement Team", "Maintenance Lead", "Scheduler"], projections: { draft: ["Pending response", "Pending response"], sent: ["Pending acknowledgement", "Pending acknowledgement"], acknowledged: ["11-Aug 09:00", "12-Aug 14:00"], delayed: ["12-Aug 09:00", "13-Aug 14:00"] },
} as const;

export const demoDashboardKpis = [
  { label: "Throughput", value: "87%", detail: "Target 90%" }, { label: "First-pass yield", value: "98.4%", detail: "Stable" }, { label: "At-risk stations", value: "2", detail: "WS-102 critical" }, { label: "Affected jobs", value: "3", detail: "J1001–J1003" }, { label: "Recovery ETA", value: "6h 15m", detail: "Local stock path" }, { label: "Shipment risk", value: "+6h", detail: "SO-8841 revised" },
] as const;

export const demoOperationsSnapshot = Object.freeze({
  workstations: demoWorkstations, failures: demoFailureCases, jobs: demoReroutingJobs, alternatives: demoReroutingAlternatives, components: demoTwinComponentTree, recoveryScenarios: demoRecoveryScenarios, shipmentSchedules: demoShipmentSchedules, notifications: demoNotifications, calendar: demoCalendarEvents, procurement: demoProcurementRequest, kpis: demoDashboardKpis,
});
