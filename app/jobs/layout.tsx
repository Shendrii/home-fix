import { ProtectedPage } from "@/components/protected-page";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage allow={["client"]}>{children}</ProtectedPage>;
}
