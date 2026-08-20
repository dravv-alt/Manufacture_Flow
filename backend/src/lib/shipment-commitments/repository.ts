import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { shipmentCommitments } from "@/lib/db/schema";

export type ShipmentCommitment = { id: string; externalId: string; productionJobIds: string[]; originalCommittedAt: Date; postCompletionMinutes: number };

export interface ShipmentCommitmentRepository {
  findAffectedByProductionJobs(productionJobIds: string[]): Promise<ShipmentCommitment[]>;
}

/** PostgreSQL-backed controlled data adapter; replace this implementation for ERP/MES/carrier data. */
export class PostgresShipmentCommitmentRepository implements ShipmentCommitmentRepository {
  async findAffectedByProductionJobs(productionJobIds: string[]) {
    if (productionJobIds.length === 0) return [];
    const commitments = await db.select().from(shipmentCommitments).where(eq(shipmentCommitments.active, true));
    return commitments.filter((commitment) => commitment.productionJobIds.some((jobId) => productionJobIds.includes(jobId)));
  }
}
