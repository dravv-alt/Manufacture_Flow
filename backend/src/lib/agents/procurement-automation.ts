export type VendorRankingInput = {
  vendorId: string;
  vendorName: string;
  contactEmail: string;
  approved: boolean;
  active: boolean;
  capabilityActive: boolean;
  leadTimeHours: number;
  unitCostCents: number;
  reliabilityScore: number;
};

export function rankEligibleVendors(candidates: VendorRankingInput[]) {
  return candidates
    .filter((candidate) => candidate.approved && candidate.active && candidate.capabilityActive && candidate.leadTimeHours > 0 && candidate.unitCostCents > 0 && candidate.reliabilityScore >= 0 && candidate.reliabilityScore <= 100)
    .sort((left, right) => left.leadTimeHours - right.leadTimeHours || left.unitCostCents - right.unitCostCents || right.reliabilityScore - left.reliabilityScore || left.vendorName.localeCompare(right.vendorName));
}
