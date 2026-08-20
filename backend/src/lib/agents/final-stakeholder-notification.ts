export type FinalStakeholderRecipientRole = "Scheduler" | "Logistics Team" | "Plant Manager";

export type FinalStakeholderNotificationContext = {
  failureCaseExternalId: string;
  classifications: Array<"ON_TIME" | "AT_RISK" | "DELAYED">;
  commitmentCount: number;
};

export type FinalStakeholderNotificationDraft = {
  recipientRole: FinalStakeholderRecipientRole;
  subject: string;
  requestedAction: string;
};

export const SHIPMENT_CUSTOMER_SERVICE_EQUIVALENT_ROLE: FinalStakeholderRecipientRole = "Logistics Team";

function highestImpact(classifications: FinalStakeholderNotificationContext["classifications"]) {
  if (classifications.includes("DELAYED")) return "DELAYED" as const;
  if (classifications.includes("AT_RISK")) return "AT_RISK" as const;
  return "ON_TIME" as const;
}

/** Maps persisted delivery impact to roles that exist in the current RBAC model. */
export function createFinalStakeholderNotificationDrafts(context: FinalStakeholderNotificationContext): FinalStakeholderNotificationDraft[] {
  if (context.commitmentCount === 0) return [];
  const impact = highestImpact(context.classifications);
  const commitmentLabel = `${context.commitmentCount} shipment commitment${context.commitmentCount === 1 ? "" : "s"}`;
  const drafts: FinalStakeholderNotificationDraft[] = [
    {
      recipientRole: "Scheduler",
      subject: `[${impact}] ${commitmentLabel} updated for ${context.failureCaseExternalId}`,
      requestedAction: "Review the executed reroutes and align the production schedule with the revised commitments.",
    },
    {
      recipientRole: SHIPMENT_CUSTOMER_SERVICE_EQUIVALENT_ROLE,
      subject: `[${impact}] ${commitmentLabel} ready for logistics review`,
      requestedAction: "Review the original and revised commitments before any customer-facing communication.",
    },
  ];
  if (impact !== "ON_TIME") {
    drafts.push({
      recipientRole: "Plant Manager",
      subject: `[${impact}] commitment risk requires plant oversight`,
      requestedAction: "Review the delivery risk, recovery projection, and executed reroutes for escalation decisions.",
    });
  }
  return drafts;
}
