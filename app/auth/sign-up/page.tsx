import { AuthForm } from "@/components/auth-form";
import { redirectIfAuthenticated } from "@/lib/auth-session-redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string }>;
}) {
  const { next, ref } = await searchParams;
  await redirectIfAuthenticated(next);
  return <AuthForm mode="sign-up" returnTo={next} referralCode={ref} />;
}
