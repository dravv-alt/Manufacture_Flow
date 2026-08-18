// demo_data
import { demoEnvironment } from "@/demo-data/environment";
import type { DemoDataProvider, OperationsDataProvider } from "@/demo-data/types";
import { demoOperationsSnapshot } from "@/demo-data/operations";

export const demoDataProvider: DemoDataProvider = Object.freeze({
  source: "demo",
  environment: demoEnvironment,
});

export const demoOperationsDataProvider: OperationsDataProvider<typeof demoOperationsSnapshot> = Object.freeze({
  ...demoDataProvider,
  state: "ready",
  getSnapshot: () => demoOperationsSnapshot,
});
