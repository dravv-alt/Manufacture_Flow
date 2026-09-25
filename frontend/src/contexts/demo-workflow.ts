import type { BackendCaseSnapshot, OperationsState, WorkflowCommand } from "./OperationsContext";
import type { ProcurementState } from "@/demo-data/ws102-scenario";

export const DEMO_STORAGE_KEY = "manufacture-flow:interactive-demo:v1";
export interface DemoWorkflow { version: 1; anchor: string; state: OperationsState; snapshot: BackendCaseSnapshot; reviewed: boolean; confirmed: boolean; started: boolean; received: boolean; message: string }

export function createDemoWorkflow(state: OperationsState, now = new Date()): DemoWorkflow {
  const at = (hours: number) => new Date(now.getTime() + hours * 3600000).toISOString();
  return { version: 1, anchor: now.toISOString(), reviewed: false, confirmed: false, started: false, received: false,
    message: "Demo incident opened. Reserve a bearing in Warehouse or review the rerouting recommendation.",
    state: { ...state, condition: "ready", selectedWorkstationId: "WS-102", selectedComponentId: "BRG-10023", allocationBlocked: true, inventoryAvailable: true, inventoryState: "available", rerouteTargetId: "WS-105", maintenanceAssignee: "Maintenance Team A" },
    snapshot: {
      failureCase: { id: "FC-2026-0047", externalId: "FC-2026-0047", workflowState: "detected", component: "Servo Motor Bearing", probability: 92, ttfHours: 20, severity: "critical" },
      workstation: { code: "WS-102", name: "CNC Lathe Alpha", status: "At Risk", capacityPercent: 35 }, part: { code: "BRG-10023", name: "Servo Motor Bearing" },
      predictions: [{ rationale: ["Simulated temperature 84.5 C and vibration 4.1 mm/s exceed demo limits."], providerName: "Demo rules", providerVersion: "1" }],
      allocationLocks: [{ state: "active", reason: "Predicted bearing failure" }], inventory: [{ onHand: 3, reserved: 2, state: "available", location: "A-03" }], reservations: [], resourceRecoveryResults: [],
      reroutePlans: [{ state: "draft", affectedJobs: ["J1001", "J1002", "J1003"] }],
      rerouteDecisions: ["J1001", "J1002", "J1003"].map((id) => ({ id: `route-${id}`, productionJobId: id, targetWorkstationId: "WS-105", outcome: "recommended", rationale: { simulated: true, capacityBefore: 45, capacityAfter: 80, compatible: true } })),
      productionJobs: ["J1001", "J1002", "J1003"].map((id, i) => ({ id, externalId: id, workstationId: "WS-102", state: "affected", operationCode: ["Milling phase 2", "Surface finish", "QC preparation"][i], toolingCode: "CNC", requiredSkill: "CNC operator", estimatedLoadPercent: i === 2 ? 15 : 10 })),
      maintenanceWorkOrders: [{ id: "WO-WS102-081", externalId: "WO-WS102-081", stage: 1, assignee: "Maintenance Team A", scenario: "local", checklist: [] }],
      procurementRequests: [{ state: "draft", externalId: "PR-10023", vendor: "Apex Motion Components", requiredBy: at(24) }], procurementMessages: [], procurementAutomationResults: [], vendorNotifications: [],
      recoveryTimeEstimates: [{ expectedRecoveryAt: at(6.25), durationMinutes: 375, scenario: "local" }],
      shipmentImpacts: [{ externalId: "SO-8841", state: "original", originalEta: at(24), revisedEta: at(24), classification: "no-impact", delayMinutes: 0, affectedJobIds: ["J1001", "J1002", "J1003"], rationale: { simulated: true } }],
      shipmentCommitments: [{ externalId: "SO-8841", originalCommittedAt: at(24), productionJobIds: ["J1001", "J1002", "J1003"] }],
      notifications: [{ id: "NT-102", recipientRole: "Plant Manager", subject: "WS-102 simulated failure prediction", state: "unread", channel: "in-app" }], notificationAttempts: [], recoveryGraphRuns: [],
      events: [{ id: "event-0", eventType: "failure_detected", actor: "Demo rules", occurredAt: at(0), payload: { simulated: true } }],
    } };
}

export function applyDemoCommand(previous: DemoWorkflow, command: WorkflowCommand, now = new Date()): DemoWorkflow {
  const next: DemoWorkflow = structuredClone(previous);
  const s = next.state, c = next.snapshot, wo = c.maintenanceWorkOrders[0];
  const require = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
  if ("expectedStage" in command) require(command.expectedStage === wo.stage, "The work order changed. Review its current stage and retry.");
  if ("workOrderId" in command) require(command.workOrderId === wo.id, "Work order not found.");
  switch (command.type) {
    case "reserve_part": {
      require(command.quantity === 1, "This work order requires exactly one bearing.");
      require(!s.bearingReserved, "One bearing is already reserved for this incident.");
      const stock = c.inventory[0]; require(stock.onHand - stock.reserved >= 1, "No available bearing. Create a procurement request first.");
      stock.reserved += 1; stock.state = "reserved"; c.reservations.push({ status: "active" });
      s.bearingReserved = true; wo.stage = 3;
      c.resourceRecoveryResults = [{ outcome: "reserved", reason: "Reserved for WO-WS102-081", availableQuantity: stock.onHand - stock.reserved }];
      next.message = "Bearing reserved and work order planned. Continue to Maintenance to start the repair."; break;
    }
    case "review_reroute": s.reviewedRerouteJobIds = c.productionJobs.map(job => job.externalId); c.rerouteDecisions.forEach(route => { if (route.outcome === "recommended") route.outcome = "reviewed"; }); next.reviewed = true; s.routingOutcome = "review"; next.message = "All three moves reviewed. The plan is ready for approval."; break;
    case "review_reroute_job": {
      require(c.productionJobs.some(job => job.externalId === command.jobId), "Affected job not found.");
      require(!s.routingApproved, "The plan has already been approved.");
      if (!s.reviewedRerouteJobIds.includes(command.jobId)) s.reviewedRerouteJobIds.push(command.jobId);
      const decision = c.rerouteDecisions.find(route => route.productionJobId === command.jobId); if (decision) decision.outcome = "reviewed";
      next.reviewed = c.productionJobs.every(job => s.reviewedRerouteJobIds.includes(job.externalId));
      s.routingOutcome = next.reviewed ? "review" : "draft";
      next.message = next.reviewed ? "All affected jobs reviewed. The plan is ready for approval." : `${command.jobId} review saved. Review the remaining affected jobs.`; break;
    }
    case "approve_reroute": require(c.productionJobs.every(job => s.reviewedRerouteJobIds.includes(job.externalId)), "Review every affected job before approval."); require(!s.routingApproved, "The plan is already approved."); next.reviewed = true; s.routingApproved = true; s.routingOutcome = "approved"; c.reroutePlans[0].state = "approved"; next.message = "Plan approved. Jobs have not moved yet; execute the approved plan next."; break;
    case "execute_reroute":
      require(s.routingOutcome === "approved", "Approve the reviewed plan before execution.");
      require(45 + c.productionJobs.reduce((sum, job) => sum + job.estimatedLoadPercent, 0) <= 100, "Target capacity exceeded.");
      c.productionJobs.forEach(job => { job.workstationId = "WS-105"; job.state = "rerouted"; });
      c.rerouteDecisions.forEach(route => { route.outcome = "rerouted"; }); c.reroutePlans[0].state = "executed"; s.routingOutcome = "executed";
      next.message = "Three jobs moved to WS-105 (80% simulated load). Confirm the execution results."; break;
    case "confirm_reroute": require(s.routingOutcome === "executed", "Execute the plan before confirmation."); require(!next.confirmed, "Execution is already confirmed."); next.confirmed = true; next.message = "Reroute confirmed. Continue to Shipment to review the delivery commitment."; break;
    case "schedule_maintenance": require(wo.stage < 3, "Maintenance is already scheduled. Open Maintenance to continue."); wo.stage = s.bearingReserved ? 3 : 2; next.message = s.bearingReserved ? "Maintenance planned. Open Maintenance to begin." : "Maintenance request recorded; awaiting a bearing reservation in Warehouse."; break;
    case "start_maintenance": require(s.bearingReserved && wo.stage === 3 && !next.started, "Reserve a bearing and use a planned work order before starting maintenance."); next.started = true; c.workstation!.status = "Under Maintenance"; next.message = "Maintenance started. Record repair completion when the simulated repair is finished."; break;
    case "record_repair_completion": require(next.started && [3, 5, 6].includes(wo.stage), "Start maintenance before recording repair completion."); require(command.notes.trim(), "Enter repair notes."); wo.stage = 4; wo.checklist = [...(wo.checklist ?? []), command.notes.trim()]; next.message = "Repair recorded. Start machine testing next."; break;
    case "start_machine_testing": require(wo.stage === 4, "Record repair completion before testing."); wo.stage = 5; next.message = "Machine testing started. Record a pass or failure with validation notes."; break;
    case "record_return_to_service_validation":
      require([5, 6].includes(wo.stage), "Start testing before recording validation."); require(command.notes.trim(), "Enter validation evidence.");
      wo.stage = command.passed ? 7 : 6;
      if (command.passed) { c.workstation!.status = "Recovered"; c.failureCase.workflowState = "resolved"; c.allocationLocks[0].state = "released"; s.allocationBlocked = false; c.inventory[0].onHand -= 1; c.inventory[0].reserved -= 1; c.reservations[0].status = "consumed"; s.bearingReserved = false; }
      next.message = command.passed ? "Validation passed. Work order closed and WS-102 returned to service." : "Validation failed. The workstation remains blocked; record rework before testing again."; break;
    case "advance_maintenance": throw new Error("Use the named maintenance actions so repair and validation evidence are recorded.");
    case "set_procurement_state": {
      const allowed: Record<ProcurementState, ProcurementState[]> = { draft: ["sent"], sent: ["draft", "acknowledged", "delayed"], acknowledged: ["delayed"], delayed: ["draft", "sent", "acknowledged"] };
      require(allowed[s.procurementState].includes(command.state), "Follow procurement order: draft → sent → acknowledged (or delayed). This transition is not available.");
      s.procurementState = command.state; c.procurementRequests[0].state = command.state;
      c.procurementMessages.push({ kind: "system", body: `Simulated vendor request ${command.state} at ${now.toLocaleString()}.` });
      c.vendorNotifications = [{ state: command.state, recipientEmail: "vendor@example.invalid", vendorName: "Apex Motion Components" }];
      next.message = `Procurement ${command.state}. No external email was sent.${command.state === "acknowledged" ? " Receive the replenishment in Warehouse next." : ""}`; break;
    }
    case "receive_part": require(s.procurementState === "acknowledged", "Record the simulated vendor acknowledgement before receiving stock."); require(!next.received, "This purchase order has already been received."); next.received = true; c.inventory[0].onHand += 1; next.message = "One replenishment bearing received into warehouse stock."; break;
    case "record_procurement_note": require(command.note.trim(), "Enter a note before saving."); s.procurementNotes.push(command.note.trim()); c.procurementMessages.push({ kind: "internal_note", body: command.note.trim() }); next.message = "Procurement note saved to this incident."; break;
    case "set_shipment_state": {
      require(command.state !== s.shipmentState, "Shipment is already in this state.");
      if (["notification-pending", "notified", "failed"].includes(command.state)) require(s.routingOutcome === "executed", "Execute the reroute before simulating shipment communications.");
      if (command.state === "notified") require(["notification-pending", "failed"].includes(s.shipmentState), "Queue the shipment notification before confirming delivery.");
      s.shipmentState = command.state; const impact = c.shipmentImpacts[0];
      impact.state = command.state === "no-impact" ? "original" : command.state === "notification-pending" ? "notification_pending" : command.state === "delayed" ? "revised" : command.state;
      if (["no-impact", "revised", "delayed"].includes(command.state)) { impact.delayMinutes = command.state === "delayed" ? 1440 : command.state === "revised" ? 360 : 0; impact.revisedEta = new Date(new Date(impact.originalEta).getTime() + impact.delayMinutes * 60000).toISOString(); }
      impact.classification = command.state;
      next.message = `Shipment ${command.state} saved. Communications are simulated, not sent to a real carrier or customer.`; break;
    }
    case "acknowledge_notification": case "retry_notification": {
      const notice = c.notifications.find(item => item.id === command.notificationId); require(notice, "Notification not found.");
      if (command.type === "retry_notification") require(notice!.state === "failed", "Only failed notifications can be retried.");
      notice!.state = command.type === "acknowledge_notification" ? "acknowledged" : "unread";
      c.notificationAttempts.push({ id: `attempt-${c.events.length}`, notificationId: notice!.id, attemptNumber: c.notificationAttempts.filter(a => a.notificationId === notice!.id).length + 1, state: notice!.state as "unread" | "acknowledged", actor: s.role, detail: "Local simulated delivery", occurredAt: now.toISOString() });
      next.message = command.type === "retry_notification" ? "Simulated delivery retried; notification is unread." : "Notification acknowledged."; break;
    }
  }
  s.maintenanceStage = wo.stage - 1; s.inventoryAvailable = c.inventory[0].onHand > c.inventory[0].reserved; s.inventoryState = s.inventoryAvailable ? "available" : "unavailable";
  c.events.unshift({ id: `event-${c.events.length}`, eventType: command.type, actor: s.role, occurredAt: now.toISOString(), payload: { simulated: true, message: next.message } });
  if (!["acknowledge_notification", "retry_notification"].includes(command.type)) c.notifications.unshift({ id: `notice-${c.events.length}`, recipientRole: s.role, subject: next.message, channel: "in-app", state: command.type === "set_shipment_state" && command.state === "failed" ? "failed" : "unread" });
  return next;
}

export function readDemoWorkflow(value: string): DemoWorkflow {
  const parsed = JSON.parse(value) as DemoWorkflow;
  if (parsed.version !== 1 || !parsed.state || !parsed.snapshot?.failureCase || !Array.isArray(parsed.snapshot.events) || !parsed.snapshot.inventory?.length || !parsed.snapshot.maintenanceWorkOrders?.length) throw new Error("Saved demo is incompatible. Reset the demo to start a fresh incident.");
  parsed.state.expandedRerouteJobId ??= "J1001";
  parsed.state.reviewedRerouteJobIds ??= parsed.reviewed ? parsed.snapshot.productionJobs.map(job => job.externalId) : [];
  return parsed;
}
