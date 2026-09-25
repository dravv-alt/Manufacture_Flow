export type RerouteJob = { id: string; operationCode: string; toolingCode: string; requiredSkill: string; estimatedLoadPercent: number };
export type RerouteStation = { id: string; code: string; status: string; capacityPercent: number; locked: boolean; capabilities: Array<{ operationCode: string; toolingCode: string; qualifiedSkill: string; active: boolean }> };

export function rankRerouteCandidates(job: RerouteJob, sourceWorkstationId: string, stations: RerouteStation[]) {
  return stations.filter((station) => station.id !== sourceWorkstationId && station.status === "Operational" && !station.locked)
    .filter((station) => station.capacityPercent + job.estimatedLoadPercent <= 100)
    .filter((station) => station.capabilities.some((capability) => capability.active && capability.operationCode === job.operationCode && capability.toolingCode === job.toolingCode && capability.qualifiedSkill === job.requiredSkill))
    .sort((left, right) => (left.capacityPercent + job.estimatedLoadPercent) - (right.capacityPercent + job.estimatedLoadPercent) || left.code.localeCompare(right.code));
}
