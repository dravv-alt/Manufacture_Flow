// demo_data
// Deterministic rules for the controlled demo. They keep fixtures coherent
// without presenting simulated values as real plant telemetry.

export type DemoHealth = "Healthy" | "Good" | "Degraded" | "Critical";
export type DemoStationStatus = "Operational" | "At Risk" | "Under Maintenance" | "Down" | "Recovered";

export type DemoStationInput = {
  id: string;
  status: DemoStationStatus;
  capacity: number;
  temperature: number;
  vibration: number;
  motorCurrent: number;
  errorLogsCount: number;
  predictedComponent: string;
  activeCaseId?: string;
};

export type DemoStationDerived = {
  status: DemoStationStatus;
  health: DemoHealth;
  failureProb: number;
  estimatedTTF: string;
  rul: string;
  predictedComponent: string;
  activeCaseId?: string;
};

export type DemoFailureSeed = {
  id: string;
  stationId: string;
  component: string;
  partId: string;
  detectedAt: string;
  state: string;
  owner: string;
};

export type DemoFailureDerived = DemoFailureSeed & {
  severity: "critical" | "warning";
  probability: number;
  ttfHours: number;
};

export type DemoRerouteJob = { id: string; original: string; target: string; impact: string };
export type DemoRerouteAlternative = { id: string; capacity: number; state: "Recommended" | "Conditional" | "Unavailable" };
export type DemoCalendarEntry = { id: string; workstationId: string };

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

/** A transparent local formula, not an ML model. */
export function calculateDemoRisk(input: Pick<DemoStationInput, "status" | "capacity" | "temperature" | "vibration" | "motorCurrent" | "errorLogsCount">) {
  if (input.status === "Under Maintenance" || input.status === "Down" || input.capacity === 0) return 100;
  const temperatureSignal = Math.max(0, (input.temperature - 40) * 0.45);
  const vibrationSignal = Math.max(0, (input.vibration - 1) * 13.5);
  const currentSignal = Math.max(0, input.motorCurrent - 8);
  const errorSignal = input.errorLogsCount * 5;
  return Math.round(clamp(5 + temperatureSignal + vibrationSignal + currentSignal + errorSignal, 0, 99));
}

export function riskToTtfHours(risk: number, status: DemoStationStatus) {
  if (status === "Under Maintenance" || status === "Down" || risk >= 100) return 0;
  if (risk >= 85) return Math.max(4, Math.round((100 - risk) * 2 + 4));
  if (risk >= 55) return Math.max(12, Math.round((100 - risk) * 1.4));
  return null;
}

export function deriveDemoWorkstation<T extends DemoStationInput>(station: T): T & DemoStationDerived {
  const failureProb = calculateDemoRisk(station);
  const hasFailureSignal = failureProb >= 55 || station.status === "Under Maintenance" || station.status === "Down";
  const health: DemoHealth = failureProb >= 85 ? "Critical" : failureProb >= 55 ? "Degraded" : failureProb >= 20 ? "Good" : "Healthy";
  const status: DemoStationStatus = station.status === "Under Maintenance" || station.status === "Down" ? station.status : failureProb >= 55 ? "At Risk" : "Operational";
  const ttfHours = riskToTtfHours(failureProb, status);
  return {
    ...station,
    status,
    health,
    failureProb,
    estimatedTTF: ttfHours === null ? "—" : `${ttfHours} Hours`,
    rul: ttfHours === null ? "—" : `${ttfHours + (failureProb >= 85 ? 4 : 6)} Hours`,
    predictedComponent: hasFailureSignal ? station.predictedComponent : "—",
    activeCaseId: hasFailureSignal ? station.activeCaseId : undefined,
  };
}

export function deriveDemoFailureCases(stations: readonly (DemoStationInput & DemoStationDerived)[], seeds: readonly DemoFailureSeed[]): DemoFailureDerived[] {
  return seeds.flatMap((seed) => {
    const station = stations.find((candidate) => candidate.id === seed.stationId);
    if (!station || station.failureProb < 55) return [];
    const ttfHours = riskToTtfHours(station.failureProb, station.status);
    if (ttfHours === null) return [];
    return [{ ...seed, severity: station.failureProb >= 85 ? "critical" : "warning", probability: station.failureProb, ttfHours }];
  });
}

export function deriveRerouteAlternatives<T extends DemoRerouteAlternative>(alternatives: readonly T[], stations: readonly Pick<DemoStationInput & DemoStationDerived, "id" | "capacity" | "failureProb" | "status">[]): T[] {
  return alternatives.map((alternative) => {
    const station = stations.find((candidate) => candidate.id === alternative.id);
    if (!station || station.capacity <= 0 || station.status === "Under Maintenance" || station.status === "Down") return { ...alternative, capacity: 0, state: "Unavailable" };
    return { ...alternative, capacity: station.capacity, state: station.failureProb >= 55 || station.capacity >= 85 ? "Conditional" : "Recommended" };
  });
}

export function validateDemoScenario(input: {
  workstations: readonly (DemoStationInput & DemoStationDerived)[];
  failures: readonly DemoFailureDerived[];
  jobs: readonly DemoRerouteJob[];
  alternatives: readonly DemoRerouteAlternative[];
  calendar: readonly DemoCalendarEntry[];
}) {
  const issues: string[] = [];
  const stationIds = new Set<string>();
  const failureIds = new Set<string>();
  for (const station of input.workstations) {
    if (stationIds.has(station.id)) issues.push(`Duplicate workstation ${station.id}.`);
    stationIds.add(station.id);
    if (station.failureProb !== calculateDemoRisk(station)) issues.push(`${station.id} does not use the demo-risk formula.`);
    if (station.failureProb >= 55 && !station.activeCaseId) issues.push(`${station.id} has a risk signal without an active case.`);
    if (station.failureProb < 55 && station.activeCaseId) issues.push(`${station.id} has an active case without a risk signal.`);
  }
  for (const failure of input.failures) {
    const station = input.workstations.find((candidate) => candidate.id === failure.stationId);
    if (failureIds.has(failure.id)) issues.push(`Duplicate failure case ${failure.id}.`);
    failureIds.add(failure.id);
    if (!station) issues.push(`${failure.id} references an unknown workstation.`);
    else {
      if (station.activeCaseId !== failure.id) issues.push(`${failure.id} is not the active case for ${station.id}.`);
      if (failure.probability !== station.failureProb) issues.push(`${failure.id} probability is not derived from ${station.id}.`);
    }
  }
  for (const job of input.jobs) {
    if (!stationIds.has(job.original)) issues.push(`${job.id} has an unknown source workstation.`);
    const target = input.alternatives.find((candidate) => candidate.id === job.target);
    if (!target || target.state === "Unavailable") issues.push(`${job.id} has no eligible reroute target.`);
  }
  for (const event of input.calendar) if (!stationIds.has(event.workstationId)) issues.push(`${event.id} references an unknown workstation.`);
  return issues;
}

export function assertValidDemoScenario(input: Parameters<typeof validateDemoScenario>[0]) {
  const issues = validateDemoScenario(input);
  if (issues.length > 0) throw new Error(`Invalid controlled demo scenario: ${issues.join(" ")}`);
}
