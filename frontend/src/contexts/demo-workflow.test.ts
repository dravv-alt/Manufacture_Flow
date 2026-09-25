import { describe, expect, it } from "vitest";
import { initialOperationsState } from "./OperationsContext";
import { applyDemoCommand, createDemoWorkflow, readDemoWorkflow } from "./demo-workflow";

describe("interactive demo workflow", () => {
  it("persists and restores a compatible scenario", () => {
    const workflow = createDemoWorkflow(initialOperationsState, new Date("2026-09-25T08:00:00Z"));
    expect(readDemoWorkflow(JSON.stringify(workflow))).toEqual(workflow);
  });

  it("enforces review, approval, execution, and confirmation order", () => {
    let workflow = createDemoWorkflow(initialOperationsState);
    expect(() => applyDemoCommand(workflow, { type: "approve_reroute" })).toThrow(/Review/);
    workflow = applyDemoCommand(workflow, { type: "review_reroute" });
    workflow = applyDemoCommand(workflow, { type: "approve_reroute" });
    workflow = applyDemoCommand(workflow, { type: "execute_reroute" });
    expect(workflow.snapshot.productionJobs.every(job => job.workstationId === "WS-105")).toBe(true);
    workflow = applyDemoCommand(workflow, { type: "confirm_reroute" });
    expect(workflow.confirmed).toBe(true);
  });

  it("restores expanded and individually reviewed affected jobs", () => {
    let workflow = createDemoWorkflow(initialOperationsState);
    workflow.state.expandedRerouteJobId = "J1002";
    workflow = applyDemoCommand(workflow, { type: "review_reroute_job", jobId: "J1001" });
    const restored = readDemoWorkflow(JSON.stringify(workflow));
    expect(restored.state.expandedRerouteJobId).toBe("J1002");
    expect(restored.state.reviewedRerouteJobIds).toEqual(["J1001"]);
    expect(restored.state.routingOutcome).toBe("draft");
  });

  it("requires a reserved part and evidence through maintenance", () => {
    let workflow = createDemoWorkflow(initialOperationsState);
    const workOrderId = workflow.snapshot.maintenanceWorkOrders[0].id;
    expect(() => applyDemoCommand(workflow, { type: "start_maintenance", workOrderId, expectedStage: 1 })).toThrow(/Reserve/);
    workflow = applyDemoCommand(workflow, { type: "reserve_part", quantity: 1 });
    workflow = applyDemoCommand(workflow, { type: "start_maintenance", workOrderId, expectedStage: 3 });
    workflow = applyDemoCommand(workflow, { type: "record_repair_completion", workOrderId, expectedStage: 3, notes: "Bearing aligned" });
    workflow = applyDemoCommand(workflow, { type: "start_machine_testing", workOrderId, expectedStage: 4 });
    workflow = applyDemoCommand(workflow, { type: "record_return_to_service_validation", workOrderId, expectedStage: 5, passed: true, notes: "Vibration normal" });
    expect(workflow.snapshot.failureCase.workflowState).toBe("resolved");
    expect(workflow.snapshot.allocationLocks[0].state).toBe("released");
    expect(workflow.snapshot.maintenanceWorkOrders[0].stage).toBe(7);
  });

  it("enforces procurement order and prevents duplicate receiving", () => {
    let workflow = createDemoWorkflow(initialOperationsState);
    expect(() => applyDemoCommand(workflow, { type: "receive_part" })).toThrow(/acknowledgement/);
    workflow = applyDemoCommand(workflow, { type: "set_procurement_state", state: "sent" });
    workflow = applyDemoCommand(workflow, { type: "set_procurement_state", state: "acknowledged" });
    workflow = applyDemoCommand(workflow, { type: "receive_part" });
    expect(workflow.snapshot.inventory[0].onHand).toBe(4);
    expect(() => applyDemoCommand(workflow, { type: "receive_part" })).toThrow(/already been received/);
  });

  it("allows an editable sent request to return to draft", () => {
    let workflow = createDemoWorkflow(initialOperationsState);
    workflow = applyDemoCommand(workflow, { type: "set_procurement_state", state: "sent" });
    workflow = applyDemoCommand(workflow, { type: "set_procurement_state", state: "draft" });
    expect(workflow.state.procurementState).toBe("draft");
    expect(workflow.snapshot.procurementRequests[0].state).toBe("draft");
  });
});
