// demo_data
import { demoWorkstations } from "@/demo-data/workstations";
import { demoNotifications, demoRecoveryScenarios, demoReroutingAlternatives, demoReroutingJobs, demoShipmentSchedules, demoTwinComponentTree } from "@/demo-data/ws102-scenario";
import { assertValidDemoScenario, deriveDemoFailureCases, deriveRerouteAlternatives, type DemoFailureSeed } from "@/demo-data/logic";

export type Role = "Plant Manager" | "Production Supervisor" | "Maintenance Lead" | "Scheduler" | "Warehouse Team" | "Procurement Team" | "Logistics Team";
export type TwinMode = "health" | "flow" | "maintenance" | "isolate" | "dependencies";
export type DataCondition = "ready" | "loading" | "stale" | "empty" | "partial" | "failed";

export interface FailureCase { id: string; stationId: string; severity: "critical" | "warning"; component: string; partId: string; probability: number; ttfHours: number; detectedAt: string; state: string; owner: string; }
export interface CalendarEvent { id: string; date: string; workstationId: string; title: string; type: "completed" | "scheduled" | "critical"; details: string; }

const demoNow = new Date();
const scenarioDate = (offsetDays: number, hour = 9, minute = 0) => { const date = new Date(demoNow); date.setDate(date.getDate() + offsetDays); date.setHours(hour, minute, 0, 0); return date; };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const displayDate = (date: Date) => date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).replace(",", "") + " IST";

const demoFailureSeeds: readonly DemoFailureSeed[] = [
  { id: "FC-2026-0047", stationId: "WS-102", component: "X-Axis Servo Motor Bearing", partId: "BRG-10023", detectedAt: displayDate(scenarioDate(0, 3, 14)), state: "Recovery plan review", owner: "Production Supervisor" },
  { id: "FC-2026-0052", stationId: "WS-108", component: "Actuator Joint B", partId: "ACT-2218", detectedAt: displayDate(scenarioDate(0, 4, 5)), state: "Monitoring", owner: "Maintenance Lead" },
  { id: "FC-2026-0041", stationId: "WS-110", component: "Optical Lens Array", partId: "LENS-4410", detectedAt: displayDate(scenarioDate(-5, 10)), state: "Maintenance execution in progress", owner: "Maintenance Lead" },
];

export const demoFailureCases: readonly FailureCase[] = deriveDemoFailureCases(demoWorkstations, demoFailureSeeds);

export const demoCalendarEvents: readonly CalendarEvent[] = [
  { id: "ME-001", date: dateKey(scenarioDate(-8)), workstationId: "WS-105", title: "Preventive calibration", type: "completed", details: "Bearing lubrication and spindle alignment completed." },
  { id: "ME-002", date: dateKey(scenarioDate(0)), workstationId: "WS-102", title: "Bearing replacement window", type: "critical", details: "WO-WS102-081 planned after BRG-10023 reservation." },
  { id: "ME-003", date: dateKey(scenarioDate(3)), workstationId: "WS-108", title: "Actuator inspection", type: "scheduled", details: "Inspect Joint B harmonic oscillation." },
  { id: "ME-004", date: dateKey(scenarioDate(6)), workstationId: "WS-112", title: "Belt tension check", type: "scheduled", details: "Quarterly conveyor drive inspection." },
] as const;

export const demoProcurementRequest = {
  id: "PR-10023-DRAFT", partId: "BRG-10023", partName: "Servo Motor Bearing", quantity: 1, requiredBy: displayDate(scenarioDate(1, 6)), linkedCase: "FC-2026-0047", workOrderId: "WO-WS102-081", vendor: "Apex Motion Components", contact: "procurement@apexmotion.example", recipients: ["Procurement Team", "Maintenance Lead", "Scheduler"], projections: { draft: ["Pending response", "Pending response"], sent: ["Pending acknowledgement", "Pending acknowledgement"], acknowledged: [displayDate(scenarioDate(1, 9)), displayDate(scenarioDate(2, 14))], delayed: [displayDate(scenarioDate(2, 9)), displayDate(scenarioDate(3, 14))] },
} as const;

export const demoDashboardKpis = [
  { label: "Throughput", value: "87%", detail: "Target 90%" }, { label: "First-pass yield", value: "98.4%", detail: "Stable" }, { label: "At-risk stations", value: "2", detail: "WS-102 critical" }, { label: "Affected jobs", value: "3", detail: "J1001–J1003" }, { label: "Recovery ETA", value: "6h 15m", detail: "Local stock path" }, { label: "Shipment risk", value: "+6h", detail: "SO-8841 revised" },
] as const;

const derivedAlternatives = deriveRerouteAlternatives(demoReroutingAlternatives, demoWorkstations);
const activeRiskStations = demoWorkstations.filter((station) => station.failureProb >= 55);
const operatingStations = demoWorkstations.filter((station) => station.capacity > 0);
const derivedDashboardKpis = [
  { label: "Throughput", value: `${Math.round(operatingStations.reduce((total, station) => total + station.capacity, 0) / operatingStations.length)}%`, detail: "Controlled capacity average" },
  { label: "First-pass yield", value: "98.4%", detail: "Controlled scenario baseline" },
  { label: "At-risk stations", value: `${activeRiskStations.length}`, detail: activeRiskStations.map((station) => station.id).join(", ") },
  { label: "Affected jobs", value: `${demoReroutingJobs.length}`, detail: demoReroutingJobs.map((job) => job.id).join(", ") },
  { label: "Recovery ETA", value: demoRecoveryScenarios.local.total, detail: "Local stock path" },
  { label: "Shipment risk", value: demoShipmentSchedules.revised.delay, detail: "SO-8841 revised" },
] as const;

assertValidDemoScenario({ workstations: demoWorkstations, failures: demoFailureCases, jobs: demoReroutingJobs, alternatives: derivedAlternatives, calendar: demoCalendarEvents });

export const demoOperationsSnapshot = Object.freeze({
  workstations: demoWorkstations, failures: demoFailureCases, jobs: demoReroutingJobs, alternatives: derivedAlternatives, components: demoTwinComponentTree, recoveryScenarios: demoRecoveryScenarios, shipmentSchedules: demoShipmentSchedules, notifications: demoNotifications, calendar: demoCalendarEvents, procurement: demoProcurementRequest, kpis: derivedDashboardKpis,
});
