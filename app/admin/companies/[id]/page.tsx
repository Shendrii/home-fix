import { redirect } from "next/navigation";

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/partners/${id}`);
}
