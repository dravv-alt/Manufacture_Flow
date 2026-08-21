import type { DemoScenarioId } from "@/contexts/OperationsContext";

export type StoryStep = { id: string; route: string; target: string; title: string; explanation: string; manualInstruction: string; action?: "trigger" | "start" | "repair" | "test" | "fail" | "pass"; evidence?: "graph" | "stage3" | "stage4" | "stage5" | "failed" | "recovered" };

const common: StoryStep[] = [
  { id: "healthy", route: "/dashboard", target: "[data-tour-id='story-launcher']", title: "Healthy plant baseline", explanation: "The Demo database starts from a deterministic, operational baseline.", manualInstruction: "Review the persisted plant KPIs, then continue." },
  { id: "telemetry", route: "/dashboard", target: "[data-tour-id='trigger-telemetry']", title: "Controlled telemetry degradation", explanation: "Three observations enter the normal telemetry ingestion service. The critical sample starts the accepted recovery graph.", manualInstruction: "Select Trigger controlled telemetry.", action: "trigger", evidence: "graph" },
  { id: "prediction", route: "/failure", target: "[data-tour-id='machine-alert']", title: "Controlled prediction and allocation lock", explanation: "The persisted prediction identifies BRG-10023, applies the workstation lock, and flags affected jobs.", manualInstruction: "Open the active failure evidence." },
  { id: "inventory", route: "/warehouse", target: "[data-tour-id='inventory-result']", title: "Inventory branch", explanation: "The resource recovery agent uses actual Demo inventory and records either a reservation or procurement requirement.", manualInstruction: "Review the persisted inventory result." },
  { id: "procurement", route: "/procurement", target: "[data-tour-id='procurement-result']", title: "Vendor selection", explanation: "When stock is unavailable, approved vendors are ranked and a request plus queued notification are persisted.", manualInstruction: "Review the procurement handoff." },
  { id: "reroute", route: "/rerouting", target: "[data-tour-id='reroute-result']", title: "Production rerouting", explanation: "Capability, tooling, skill, lock, and projected capacity drive real persisted reroute decisions.", manualInstruction: "Inspect affected jobs and targets." },
  { id: "shipment", route: "/shipment", target: "[data-tour-id='shipment-map']", title: "Delivery impact", explanation: "Shipment commitments are recalculated from recovery and reroute evidence.", manualInstruction: "Pan, zoom, fit the route, or select an affected shipment." },
  { id: "notifications", route: "/notifications", target: "[data-tour-id='notification-result']", title: "Stakeholder notification", explanation: "In-app notifications and delivery attempts are persisted; no external delivery is claimed.", manualInstruction: "Review the stakeholder audit state." },
  { id: "maintenance-start", route: "/maintenance", target: "[data-tour-id='maintenance-start']", title: "Start maintenance", explanation: "An authorized command moves the machine into maintenance execution.", manualInstruction: "Select Start Maintenance.", action: "start", evidence: "stage3" },
  { id: "repair", route: "/maintenance", target: "[data-tour-id='repair-complete']", title: "Record repair", explanation: "The bearing repair is persisted against the accepted work order.", manualInstruction: "Select Record Repair Complete.", action: "repair", evidence: "stage4" },
  { id: "testing", route: "/maintenance", target: "[data-tour-id='machine-testing']", title: "Machine testing", explanation: "Return-to-service testing begins while the allocation lock remains active.", manualInstruction: "Select Start Machine Testing.", action: "test", evidence: "stage5" },
  { id: "validation-fail", route: "/maintenance", target: "[data-tour-id='validation-fail']", title: "Safety validation fails", explanation: "The intentional failure keeps WS-102 locked and records REQUIRES_INTERVENTION.", manualInstruction: "Select Validation FAIL.", action: "fail", evidence: "failed" },
  { id: "rework", route: "/maintenance", target: "[data-tour-id='repair-complete']", title: "Corrective rework", explanation: "The technician records corrective rework through the same protected route.", manualInstruction: "Select Record Repair Complete again.", action: "repair", evidence: "stage4" },
  { id: "retest", route: "/maintenance", target: "[data-tour-id='machine-testing']", title: "Retest", explanation: "The machine is tested again after rework.", manualInstruction: "Select Start Machine Testing.", action: "test", evidence: "stage5" },
  { id: "validation-pass", route: "/maintenance", target: "[data-tour-id='validation-pass']", title: "Return to service", explanation: "A passing validation completes the work order, releases the lock, restores OPERATIONAL, and persists RECOVERED.", manualInstruction: "Select Validation PASS.", action: "pass", evidence: "recovered" },
];

export function getStorySteps(scenario: DemoScenarioId) {
  if (scenario === "local-spare") return common.filter((step) => !["procurement", "validation-fail", "rework", "retest"].includes(step.id));
  if (scenario === "failure-rework") return common.filter((step) => !["procurement", "reroute", "shipment", "notifications"].includes(step.id));
  return common;
}
