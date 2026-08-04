import { AdminJobDetail } from "@/components/admin-job-detail";

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminJobDetail id={id} />;
}
