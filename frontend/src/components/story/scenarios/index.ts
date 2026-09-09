import { goldenSteps } from "./golden";
import { localSpareSteps } from "./local-spare";
import { failureReworkSteps } from "./failure-rework";
import type { DemoScenarioId } from "@/contexts/OperationsContext";
import type { StoryStep } from "../story.types";

export { goldenSteps } from "./golden";
export { localSpareSteps } from "./local-spare";
export { failureReworkSteps } from "./failure-rework";

const scenarios: Record<DemoScenarioId, StoryStep[]> = {
  golden: goldenSteps,
  "local-spare": localSpareSteps,
  "failure-rework": failureReworkSteps,
};

export function getScenarioSteps(id: DemoScenarioId): StoryStep[] {
  return scenarios[id] ?? goldenSteps;
}
