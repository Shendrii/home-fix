import { ProtectedPage } from "@/components/protected-page";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage allow={["admin", "superadmin"]}>{children}</ProtectedPage>;
}
