import { ProtectedPage } from "@/components/protected-page";
import { RequestForm } from "@/components/request-form";
import { bookingPath } from "@/lib/auth-return";

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <ProtectedPage allow={["client"]} signInNext={bookingPath(service)}>
      <RequestForm initialService={service} />
    </ProtectedPage>
  );
}
