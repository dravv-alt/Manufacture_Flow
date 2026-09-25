import type { WorkflowCommand } from "@/contexts/OperationsContext";

/** How the step interacts with the application */
export type StepMode = "observe" | "action" | "system";

/** What the story engine does to advance state */
export type StoryAction =
  | { type: "trigger_telemetry" }
  | { type: "navigate"; route: string }
  | { type: "workflow"; command: WorkflowCommand }
  | { type: "click_sequence"; selectors: string[] }
  | { type: "none" };

/** What the system must prove happened before advancing */
export type StoryEvidence =
  | { type: "active_case" }
  | { type: "bearing_reserved" }
  | { type: "reroute_approved" }
  | { type: "notification_created" }
  | { type: "maintenance_stage"; min: number }
  | { type: "validation_failed" }
  | { type: "workflow_recovered" }
  | { type: "none" };

/** A single step in a story scenario */
export interface StoryStep {
  id: string;
  route: string;
  target?: string;
  title: string;
  description: string;
  manualInstruction?: string;
  mode: StepMode;
  action: StoryAction;
  evidence: StoryEvidence;
}
