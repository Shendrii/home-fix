import { ProtectedPage } from "@/components/protected-page";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage allow={["partner"]} allowActing="partner">{children}</ProtectedPage>;
}
