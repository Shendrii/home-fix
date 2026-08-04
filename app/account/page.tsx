import { AccountSettingsScreen } from "@/components/account-settings";
import { ProtectedPage } from "@/components/protected-page";

export default function AccountPage() {
  return (
    <ProtectedPage allow={["client", "partner", "admin", "superadmin"]} allowIncompleteClientProfile>
      <AccountSettingsScreen />
    </ProtectedPage>
  );
}
