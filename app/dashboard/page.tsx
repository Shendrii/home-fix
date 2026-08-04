import { ProtectedPage } from "@/components/protected-page";
import { ClientHome } from "@/components/screens";

export default function DashboardPage() {
  return <ProtectedPage allow={["client"]}><ClientHome /></ProtectedPage>;
}
