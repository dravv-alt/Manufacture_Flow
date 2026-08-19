export type FailurePredictionAlertContext = {
  workstationCode: string;
  component: string;
  partCode: string;
  probability: number;
  ttfHours: number;
  failureCaseExternalId: string;
};

export type FailurePredictionAlert = {
  recipientRole: "Production Supervisor" | "Maintenance Manager" | "Plant Head";
  subject: string;
  detail: string;
};

/** Creates the three distinct BRD recipients for a persisted failure prediction only. */
export function createFailurePredictionAlerts(context: FailurePredictionAlertContext): FailurePredictionAlert[] {
  return [
    {
      recipientRole: "Production Supervisor",
      subject: `${context.workstationCode} predicted failure requires production review`,
      detail: `${context.component} has a ${context.probability}% controlled failure prediction with a ${context.ttfHours}h intervention window. Case ${context.failureCaseExternalId} is awaiting the next approved workflow step.`,
    },
    {
      recipientRole: "Maintenance Manager",
      subject: `${context.workstationCode} maintenance preparation required`,
      detail: `Prepare for ${context.component}; predicted replacement part ${context.partCode}. The controlled prediction reports ${context.probability}% risk within ${context.ttfHours}h.`,
    },
    {
      recipientRole: "Plant Head",
      subject: `${context.workstationCode} continuity risk detected`,
      detail: `Plant continuity review is required for case ${context.failureCaseExternalId}: ${context.component} is predicted at ${context.probability}% risk. No allocation, procurement, or shipment action has been executed by this alert.`,
    },
  ];
}
