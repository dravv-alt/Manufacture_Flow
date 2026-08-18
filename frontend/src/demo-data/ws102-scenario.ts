// demo_data
export type DemoBadgeVariant = "outline" | "secondary" | "destructive";

export type NotificationStatus = "unread" | "failed" | "acknowledged";

export interface DemoNotification {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly status: NotificationStatus;
  readonly href: string;
}

export const demoNotifications: readonly DemoNotification[] = [
  { id: "NT-102", title: "WS-102 failure prediction", detail: "92% bearing failure risk / FC-2026-0047", status: "unread", href: "/failure/FC-2026-0047" },
  { id: "NT-117", title: "BRG-10023 reservation confirmed", detail: "Reservation R-10023 linked to WO-WS102-081", status: "acknowledged", href: "/warehouse" },
  { id: "NT-121", title: "Shipment delivery retry required", detail: "Logistics Desk notification did not confirm delivery", status: "failed", href: "/shipment" },
  { id: "NT-128", title: "Vendor acknowledgement recorded", detail: "Apex Motion Components confirmed the request state", status: "unread", href: "/procurement" },
] as const;

export interface ReroutingJob {
  readonly id: string;
  readonly operation: string;
  readonly priority: string;
  readonly original: string;
  readonly target: string;
  readonly impact: string;
}

export const demoReroutingJobs: readonly ReroutingJob[] = [
  { id: "J1001", operation: "Milling phase 2", priority: "Tier 1", original: "WS-102", target: "WS-105", impact: "+0h" },
  { id: "J1002", operation: "Surface finish", priority: "Tier 2", original: "WS-102", target: "WS-105", impact: "+1h" },
  { id: "J1003", operation: "QC preparation", priority: "Tier 3", original: "WS-102", target: "WS-108", impact: "+1h" },
] as const;

export interface ReroutingAlternative {
  readonly id: string;
  readonly label: string;
  readonly capacity: number;
  readonly state: "Recommended" | "Conditional" | "Unavailable";
}

export const demoReroutingAlternatives: readonly ReroutingAlternative[] = [
  { id: "WS-105", label: "Precision Milling Center", capacity: 75, state: "Recommended" },
  { id: "WS-108", label: "6-Axis Robot Arm", capacity: 55, state: "Conditional" },
  { id: "WS-110", label: "Laser Cutter Sigma", capacity: 0, state: "Unavailable" },
] as const;

export type RecoveryScenarioId = "local" | "vendor";

export interface RecoveryScenario {
  readonly label: string;
  readonly availability: string;
  readonly total: string;
  readonly steps: readonly (readonly [string, string])[];
}

export const demoRecoveryScenarios: Readonly<Record<RecoveryScenarioId, RecoveryScenario>> = {
  local: {
    label: "Scenario 1 / local bearing available",
    availability: "10-Aug-2026 / 06:45 IST",
    total: "6h 15m",
    steps: [["Part transfer", "45m"], ["Bearing replacement", "2h 30m"], ["Testing", "1h 30m"], ["Quality validation", "1h 30m"]],
  },
  vendor: {
    label: "Scenario 2 / vendor replenishment required",
    availability: "12-Aug-2026 / 20:30 IST",
    total: "60h",
    steps: [["Vendor lead time", "36h"], ["Transportation + inspection", "12h"], ["Bearing replacement", "6h"], ["Testing + quality validation", "6h"]],
  },
};

export const demoMaintenanceStages = ["Created", "Waiting for part", "Planned", "Installed", "Testing", "Validation", "Returned to service"] as const;

export type ProcurementState = "draft" | "sent" | "acknowledged" | "delayed";
export const demoProcurementStates: Readonly<Record<ProcurementState, { readonly label: string; readonly detail: string; readonly badge: DemoBadgeVariant }>> = {
  draft: { label: "DRAFT", detail: "Review required before the vendor request is sent.", badge: "outline" },
  sent: { label: "SENT", detail: "Vendor request delivered to Apex Motion Components.", badge: "secondary" },
  acknowledged: { label: "VENDOR ACKNOWLEDGED", detail: "Expected dispatch confirmed for 09:00 tomorrow.", badge: "secondary" },
  delayed: { label: "DELAYED", detail: "Vendor response reports a 24-hour dispatch delay.", badge: "destructive" },
};

export type ShipmentState = "no-impact" | "revised" | "delayed" | "notification-pending" | "notified" | "failed";
export const demoShipmentStates: Readonly<Record<ShipmentState, { readonly label: string; readonly description: string; readonly badge: DemoBadgeVariant }>> = {
  "no-impact": { label: "NO IMPACT", description: "Recovery stays inside the original commitment window.", badge: "secondary" },
  revised: { label: "REVISED", description: "A revised internal production commitment is awaiting notification.", badge: "outline" },
  delayed: { label: "DELAYED", description: "Recovery pushes the shipment past the original commitment.", badge: "destructive" },
  "notification-pending": { label: "NOTIFICATION PENDING", description: "Operations decision is complete; stakeholder delivery is not yet confirmed.", badge: "outline" },
  notified: { label: "NOTIFIED", description: "Shipment, Logistics, and Customer Service delivery states are confirmed.", badge: "secondary" },
  failed: { label: "DELIVERY FAILED", description: "One stakeholder channel failed; retry remains available.", badge: "destructive" },
};

export const demoShipmentSchedules = {
  original: { completion: "09-Aug / 14:00", shipment: "09-Aug / 18:00", delay: "0h" },
  revised: { completion: "10-Aug / 14:00", shipment: "10-Aug / 18:00", delay: "+6h" },
  delayed: { completion: "11-Aug / 16:00", shipment: "12-Aug / 09:00", delay: "+24h" },
} as const;

export interface DemoShipmentRoutePoint {
  readonly label: string;
  readonly shortLabel: string;
  readonly position: readonly [number, number];
  readonly detail: string;
}

// demo_data
// Controlled route and weather fixtures. No carrier, map, location, or weather provider is connected.
export const demoShipmentRoute = {
  origin: { label: "Apex Motion Components", shortLabel: "Apex Hub", position: [16, 72] as const, detail: "Vendor dispatch hub / Pune" },
  checkpoints: [
    { label: "Nashik cross-dock", shortLabel: "Cross-dock", position: [43, 48] as const, detail: "Manifest review complete" },
    { label: "Plant Alpha receiving", shortLabel: "Plant Alpha", position: [77, 28] as const, detail: "WS-102 recovery receiving dock" },
  ] as const satisfies readonly DemoShipmentRoutePoint[],
  weather: {
    label: "Western corridor conditions",
    condition: "Dry with isolated wind gusts",
    temperature: "29 C",
    wind: "18 km/h WNW",
    visibility: "9 km",
    impact: "No route restriction in the selected scenario",
  },
} as const;

export interface TwinComponent {
  readonly id: "cnc" | "x-axis" | "bearing" | "sensors";
  readonly label: string;
  readonly state: string;
}

export const demoTwinComponentTree: readonly TwinComponent[] = [
  { id: "cnc", label: "Haas VF-2SS CNC", state: "Asset root" },
  { id: "x-axis", label: "X-Axis Servo Assembly", state: "At risk" },
  { id: "bearing", label: "Servo Motor Bearing / BRG-10023", state: "92% failure probability" },
  { id: "sensors", label: "Vibration + temperature evidence", state: "3 threshold events" },
] as const;
