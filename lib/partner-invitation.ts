export type PartnerInvitationRow = {
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
  target_company_id?: string | null;
};

/** Distinguishes admin instant provisioning vs partner completing a signup invite email. */
export function partnerInvitationStatus(invitation: PartnerInvitationRow) {
  if (invitation.revoked_at) {
    return { label: "Revoked", hint: "Invitation was cancelled." };
  }
  const joiningCompany = Boolean(invitation.target_company_id);
  if (!invitation.accepted_at) {
    if (new Date(invitation.expires_at) < new Date()) {
      return { label: "Expired", hint: "Signup email was not completed in time." };
    }
    return {
      label: "Awaiting signup",
      hint: joiningCompany
        ? "Signup email sent. They join this company when they accept."
        : "Supabase signup invite email sent — company is created when they accept.",
    };
  }

  const ms = new Date(invitation.accepted_at).getTime() - new Date(invitation.invited_at).getTime();
  if (ms < 15_000) {
    return {
      label: "Company linked",
      hint: joiningCompany
        ? "They already had a HomeFix login and were added to this company."
        : "They already had a HomeFix login. No signup invite — use sign-in link or Google.",
    };
  }

  return {
    label: "Accepted signup",
    hint: joiningCompany
      ? "They accepted the email invite and joined this company."
      : "Partner completed the email invite and signed up.",
  };
}
