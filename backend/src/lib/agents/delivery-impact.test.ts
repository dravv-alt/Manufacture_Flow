import { describe, expect, it } from "vitest";
import { DELIVERY_IMPACT_RISK_BUFFER_MINUTES, calculateDeliveryImpact } from "./delivery-impact";

const commitment = new Date("2026-08-20T12:00:00.000Z");

describe("DeliveryImpactAgent deterministic policy", () => {
  it("classifies a comfortably safe commitment as ON_TIME", () => expect(calculateDeliveryImpact({ projectedCompletionAt: new Date("2026-08-20T08:00:00.000Z"), originalCommittedAt: commitment, postCompletionMinutes: 0 }).classification).toBe("ON_TIME"));
  it("classifies a commitment inside the documented risk buffer as AT_RISK", () => expect(calculateDeliveryImpact({ projectedCompletionAt: new Date("2026-08-20T10:30:00.000Z"), originalCommittedAt: commitment, postCompletionMinutes: 0 }).classification).toBe("AT_RISK"));
  it("classifies a commitment after its original date as DELAYED", () => {
    const impact = calculateDeliveryImpact({ projectedCompletionAt: new Date("2026-08-20T12:30:00.000Z"), originalCommittedAt: commitment, postCompletionMinutes: 0 });
    expect(impact).toMatchObject({ classification: "DELAYED", delayMinutes: 30 });
  });
  it("includes configurable post-completion timing in the projection", () => expect(calculateDeliveryImpact({ projectedCompletionAt: new Date("2026-08-20T09:00:00.000Z"), originalCommittedAt: commitment, postCompletionMinutes: 120 })).toMatchObject({ classification: "AT_RISK", riskBufferMinutes: DELIVERY_IMPACT_RISK_BUFFER_MINUTES }));
});
