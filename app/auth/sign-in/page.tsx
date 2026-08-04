import { AuthForm } from "@/components/auth-form";
import { redirectIfAuthenticated } from "@/lib/auth-session-redirect";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  await redirectIfAuthenticated(next);
  return <AuthForm mode="sign-in" returnTo={next} authError={error} />;
}
