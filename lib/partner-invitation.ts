export type PartnerInvitationRow = {
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

/** Distinguishes admin instant provisioning vs partner completing a signup invite email. */
export function partnerInvitationStatus(invitation: PartnerInvitationRow) {
  if (invitation.revoked_at) {
    return { label: "Revoked", hint: "Invitation was cancelled." };
  }
  if (!invitation.accepted_at) {
    if (new Date(invitation.expires_at) < new Date()) {
      return { label: "Expired", hint: "Signup email was not completed in time." };
    }
    return {
      label: "Awaiting signup",
      hint: "Supabase signup invite email sent — company is created when they accept.",
    };
  }

  const ms = new Date(invitation.accepted_at).getTime() - new Date(invitation.invited_at).getTime();
  if (ms < 15_000) {
    return {
      label: "Company linked",
      hint: "They already had a HomeFix login. No signup invite — use sign-in link or Google.",
    };
  }

  return {
    label: "Accepted signup",
    hint: "Partner completed the email invite and signed up.",
  };
}
