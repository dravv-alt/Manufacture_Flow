// demo_data
import type { DemoEnvironment } from "@/demo-data/types";

export const demoEnvironment = {
  source: "demo",
  label: "DEMO DATA",
  plant: "North Fabrication Plant",
  reviewedAt: "Controlled review state",
  workstations: 12,
  activeRisks: 1,
} satisfies DemoEnvironment;
