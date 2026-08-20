import { describe, expect, it } from "vitest";
import { rankRerouteCandidates } from "./production-rerouting";

const job = { id: "job", operationCode: "CNC_MILL", toolingCode: "T-01", requiredSkill: "CNC_OPERATOR", estimatedLoadPercent: 20 };
const station = (id: string, code: string, capacityPercent: number, overrides: Partial<{ status: string; locked: boolean; capabilities: Array<{ operationCode: string; toolingCode: string; qualifiedSkill: string; active: boolean }> }> = {}) => ({ id, code, capacityPercent, status: "Operational", locked: false, capabilities: [{ operationCode: "CNC_MILL", toolingCode: "T-01", qualifiedSkill: "CNC_OPERATOR", active: true }], ...overrides });

describe("ProductionReroutingAgent candidate ranking", () => {
  it("selects the least-loaded compatible unlocked workstation", () => expect(rankRerouteCandidates(job, "source", [station("source", "WS-102", 0), station("high", "WS-108", 70), station("best", "WS-105", 40)]).map((item) => item.id)).toEqual(["best", "high"]));
  it("rejects insufficient capacity and incompatible tooling", () => expect(rankRerouteCandidates(job, "source", [station("full", "WS-105", 81), station("tool", "WS-108", 20, { capabilities: [{ operationCode: "CNC_MILL", toolingCode: "T-02", qualifiedSkill: "CNC_OPERATOR", active: true }] })])).toEqual([]));
  it("rejects locked and offline workstations", () => expect(rankRerouteCandidates(job, "source", [station("locked", "WS-105", 20, { locked: true }), station("offline", "WS-108", 20, { status: "Offline" })])).toEqual([]));
});
