export const DELIVERY_IMPACT_CALCULATION_VERSION = "delivery-impact-v1";
export const DELIVERY_IMPACT_RISK_BUFFER_MINUTES = 120;

export type DeliveryImpactClassification = "ON_TIME" | "AT_RISK" | "DELAYED";

export function calculateDeliveryImpact(input: { projectedCompletionAt: Date; originalCommittedAt: Date; postCompletionMinutes: number; riskBufferMinutes?: number }) {
  const riskBufferMinutes = input.riskBufferMinutes ?? DELIVERY_IMPACT_RISK_BUFFER_MINUTES;
  const revisedProjectedAt = new Date(input.projectedCompletionAt.getTime() + input.postCompletionMinutes * 60_000);
  const marginMinutes = Math.round((input.originalCommittedAt.getTime() - revisedProjectedAt.getTime()) / 60_000);
  const classification: DeliveryImpactClassification = marginMinutes < 0 ? "DELAYED" : marginMinutes <= riskBufferMinutes ? "AT_RISK" : "ON_TIME";
  return { revisedProjectedAt, marginMinutes, delayMinutes: Math.max(0, -marginMinutes), classification, riskBufferMinutes };
}
