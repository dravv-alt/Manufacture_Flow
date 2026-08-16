// demo_data
export type DataSource = "demo";

export interface DemoEnvironment {
  readonly source: DataSource;
  readonly label: "DEMO DATA";
  readonly plant: string;
  readonly reviewedAt: string;
  readonly workstations: number;
  readonly activeRisks: number;
}

/**
 * Explicit boundary for controlled scenario data. A future API adapter must
 * expose its own provider rather than presenting simulated values as live.
 */
export interface DemoDataProvider {
  readonly source: DataSource;
  readonly environment: DemoEnvironment;
}

export type OperationsDataState = "ready" | "loading" | "stale" | "empty" | "partial" | "failed";

export interface OperationsDataProvider<TSnapshot = unknown> {
  readonly source: DataSource | "api";
  readonly environment: DemoEnvironment;
  readonly state: OperationsDataState;
  getSnapshot(): TSnapshot;
}
