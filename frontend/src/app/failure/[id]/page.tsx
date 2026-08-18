import { FailureCaseDetail } from "@/components/operations/FailureViews";
export default async function FailureCasePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <FailureCaseDetail caseId={id} />; }
