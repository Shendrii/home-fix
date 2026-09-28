import { AdminCompanyDetail } from "@/components/admin-company-detail";

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCompanyDetail companyId={id} />;
}
