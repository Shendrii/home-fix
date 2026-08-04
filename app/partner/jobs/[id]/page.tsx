import { PartnerJobDetail } from "@/components/partner-job-detail";

export default async function PartnerJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerJobDetail id={id} />;
}
