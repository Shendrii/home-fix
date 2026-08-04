"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authPathWithReturn, isClientBookingPath, safeReturnTo } from "@/lib/auth-return";
import { buildAuthCallbackUrl, OAUTH_NO_ACCOUNT_ERROR } from "@/lib/oauth-callback";
import { profileNeedsPersonalDetails } from "@/lib/profile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1.5 text-sm text-red-600">{message}</p>;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth: "Google sign-in could not be completed. Please try again.",
  configuration: "Sign-in is not configured correctly. Contact support if this continues.",
  [OAUTH_NO_ACCOUNT_ERROR]: "You don't have an account. Please sign up first.",
};

export function AuthForm({
  mode,
  returnTo,
  authError,
  referralCode,
}: {
  mode: "sign-in" | "sign-up";
  returnTo?: string | null;
  authError?: string | null;
  /** From `?ref=CODE` on the sign-up link — attribution only, no incentive is granted. */
  referralCode?: string | null;
}) {
  const router = useRouter();
  const resumePath = safeReturnTo(returnTo);
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const termsId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmErrorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState<"idle" | "email" | "google">("idle");
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const signUp = mode === "sign-up";
  const busy = loading !== "idle";
  const alternateAuthHref = authPathWithReturn(signUp ? "/auth/sign-in" : "/auth/sign-up", resumePath);

  useEffect(() => {
    if (!authError) return;
    const message = AUTH_ERROR_MESSAGES[authError] ?? "Something went wrong. Please try again.";
    toast.error(message);
  }, [authError]);

  // Browser password managers autofill without firing React onChange; sync DOM → state.
  useEffect(() => {
    const input = document.getElementById(emailId) as HTMLInputElement | null;
    if (!input) return;
    const sync = () => {
      if (input.value && input.value !== email) setEmail(input.value);
    };
    sync();
    input.addEventListener("change", sync);
    return () => input.removeEventListener("change", sync);
  }, [email, emailId]);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const emailError = emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email)
    ? "Enter a valid email address."
    : emailTouched && !email
      ? "Email is required."
      : undefined;
  const passwordError = passwordTouched
    ? !password
      ? "Password is required."
      : signUp && (!checks.minLength || !checks.hasLetter || !checks.hasNumber)
        ? "Use at least 8 characters with a letter and a number."
        : !signUp && password.length < 6
          ? "Password must be at least 6 characters."
          : undefined
    : undefined;
  const confirmError = signUp && confirmTouched
    ? !confirmPassword
      ? "Confirm your password."
      : confirmPassword !== password
        ? "Passwords do not match."
        : undefined
    : undefined;

  async function routeAfterAuth(userId: string, options?: { afterSignUp?: boolean }) {
    const supabase = createClient();
    if (!supabase) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, phone, default_address")
      .eq("id", userId)
      .single();
    if (resumePath && profile?.role === "client" && isClientBookingPath(resumePath)) {
      router.push(resumePath);
      router.refresh();
      return;
    }
    if (
      options?.afterSignUp &&
      profile?.role === "client" &&
      profileNeedsPersonalDetails(profile)
    ) {
      router.push("/account");
      router.refresh();
      return;
    }
    const destination = profile?.role === "partner"
      ? "/partner"
      : profile?.role === "admin" || profile?.role === "superadmin"
        ? "/admin"
        : "/dashboard";
    router.push(destination);
    router.refresh();
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured");
    setLoading("google");
    const redirectTo = buildAuthCallbackUrl(location.origin, {
      intent: signUp ? "signup" : "signin",
      next: resumePath,
    });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setLoading("idle");
      toast.error(error.message);
    }
  }

  function validateBeforeSubmit() {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (signUp) {
      setConfirmTouched(true);
      if (!acceptedTerms) {
        toast.error("Accept the Terms and Privacy Policy to continue.");
        return false;
      }
    }
    if (!EMAIL_PATTERN.test(email)) return false;
    if (signUp) {
      const next = passwordChecks(password);
      if (!next.minLength || !next.hasLetter || !next.hasNumber) return false;
      if (password !== confirmPassword) return false;
    } else if (password.length < 6) {
      return false;
    }
    return true;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validateBeforeSubmit()) return;
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured");
    setLoading("email");
    const emailRedirectTo = buildAuthCallbackUrl(location.origin, {
      intent: "signup",
      next: resumePath,
    });
    const result = signUp
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo,
            data: referralCode ? { referral_code: referralCode } : undefined,
          },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading("idle");
    if (result.error) return toast.error(result.error.message);

    // Avoid account enumeration: always show a neutral confirmation when there is no session after signup.
    if (signUp && !result.data.session) {
      setConfirmationEmail(email.trim());
      return;
    }

    const userId = result.data.user?.id;
    if (!userId) return toast.error("Unable to complete sign-in. Try again.");
    await routeAfterAuth(userId, { afterSignUp: signUp });
  }

  if (confirmationEmail) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#faf8f3] p-5">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[0_18px_60px_rgba(15,23,42,.1)]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-teal-100 text-teal-700">
            <Mail className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">Check your inbox</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            If an account can be created for <strong className="text-slate-900">{confirmationEmail}</strong>, we sent a confirmation link there.
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Already registered?{" "}
            <Link href="/auth/sign-in" className="font-semibold text-teal-700 underline-offset-2 hover:underline">
              Sign in
            </Link>
            {" "}or use{" "}
            <Link href="/auth/sign-in" className="font-semibold text-teal-700 underline-offset-2 hover:underline">
              Continue with Google
            </Link>
            . Check spam if nothing arrives.
          </p>
          <Link
            href="/auth/sign-in"
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-600 font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf8f3] p-5">
      <form
        onSubmit={submit}
        noValidate
        className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.1)]"
      >
        <Link href="/" className="font-bold text-teal-700">← HomeFix</Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
          {signUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {resumePath && isClientBookingPath(resumePath)
            ? "Sign in to continue booking your appointment."
            : signUp
              ? "Start requesting trusted home help."
              : "Sign in to manage your home services."}
        </p>

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={signInWithGoogle}
          className="mt-7 h-12 w-full gap-3 bg-white text-slate-800"
        >
          <GoogleMark />
          {loading === "google" ? "Connecting to Google…" : "Continue with Google"}
        </Button>
        {signUp && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Google sign-up will ask you to complete phone and address under Account settings.
          </p>
        )}

        <div className="my-6 flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          or continue with email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={emailId} className="mb-1.5 block text-sm font-semibold text-slate-800">
              Email address
            </label>
            <Input
              id={emailId}
              autoFocus
              required
              type="email"
              name={signUp ? "email" : "username"}
              autoComplete={signUp ? "email" : "username"}
              inputMode="email"
              value={email}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? emailErrorId : undefined}
              onBlur={() => setEmailTouched(true)}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={cn("h-12", emailError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
            />
            <FieldError id={emailErrorId} message={emailError} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor={passwordId} className="block text-sm font-semibold text-slate-800">
                Password
              </label>
              {!signUp && (
                <Link href="/auth/forgot-password" className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Input
                id={passwordId}
                required
                type={showPassword ? "text" : "password"}
                autoComplete={signUp ? "new-password" : "current-password"}
                value={password}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? passwordErrorId : signUp ? `${passwordId}-hint` : undefined}
                onBlur={() => setPasswordTouched(true)}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={signUp ? "At least 8 characters" : "Your password"}
                className={cn("h-12 pr-12", passwordError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 transition-colors hover:text-slate-800"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id={passwordErrorId} message={passwordError} />
            {signUp && (
              <ul id={`${passwordId}-hint`} className="mt-2 space-y-1 text-xs text-slate-500">
                <li className={checks.minLength ? "text-teal-700" : undefined}>At least 8 characters</li>
                <li className={checks.hasLetter ? "text-teal-700" : undefined}>Contains a letter</li>
                <li className={checks.hasNumber ? "text-teal-700" : undefined}>Contains a number</li>
              </ul>
            )}
          </div>

          {signUp && (
            <div>
              <label htmlFor={confirmId} className="mb-1.5 block text-sm font-semibold text-slate-800">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id={confirmId}
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  aria-invalid={Boolean(confirmError)}
                  aria-describedby={confirmError ? confirmErrorId : undefined}
                  onBlur={() => setConfirmTouched(true)}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  className={cn("h-12 pr-12", confirmError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 transition-colors hover:text-slate-800"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FieldError id={confirmErrorId} message={confirmError} />
            </div>
          )}

          {signUp && (
            <label htmlFor={termsId} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <input
                id={termsId}
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 size-4 rounded border-slate-300 text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-600/40"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-teal-700 underline-offset-2 hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="font-semibold text-teal-700 underline-offset-2 hover:underline">Privacy Policy</Link>.
              </span>
            </label>
          )}
        </div>

        <Button
          type="submit"
          disabled={busy || (signUp && !acceptedTerms)}
          className="mt-6 h-12 w-full"
        >
          {loading === "email" ? "Please wait…" : signUp ? "Create account" : "Sign in"}
        </Button>

        <p className="mt-5 text-center text-sm text-slate-600">
          {signUp ? "Already have an account?" : "New to HomeFix?"}{" "}
          <Link className="font-semibold text-teal-700 underline-offset-2 hover:underline" href={alternateAuthHref}>
            {signUp ? "Sign in" : "Create account"}
          </Link>
        </p>
      </form>
    </main>
  );
}

export function ForgotPasswordForm() {
  const emailId = useId();
  const emailErrorId = useId();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailError = emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email)
    ? "Enter a valid email address."
    : emailTouched && !email
      ? "Email is required."
      : undefined;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    if (!EMAIL_PATTERN.test(email)) return;
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#faf8f3] p-5">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[0_18px_60px_rgba(15,23,42,.1)]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-teal-100 text-teal-700">
            <Mail className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">Check your inbox</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            If an account exists for <strong className="text-slate-900">{sentTo}</strong>, we sent a password reset link.
          </p>
          <Link href="/auth/sign-in" className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-600 font-semibold text-white transition-colors hover:bg-teal-700">
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf8f3] p-5">
      <form onSubmit={submit} noValidate className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.1)]">
        <Link href="/auth/sign-in" className="font-bold text-teal-700">← Back to sign in</Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter your email and we’ll send a reset link if an account exists.</p>
        <div className="mt-7">
          <label htmlFor={emailId} className="mb-1.5 block text-sm font-semibold text-slate-800">Email address</label>
          <Input
            id={emailId}
            autoFocus
            required
            type="email"
            autoComplete="email"
            value={email}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? emailErrorId : undefined}
            onBlur={() => setEmailTouched(true)}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={cn("h-12", emailError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
          />
          <FieldError id={emailErrorId} message={emailError} />
        </div>
        <Button type="submit" disabled={loading} className="mt-6 h-12 w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </main>
  );
}

export function ResetPasswordForm() {
  const passwordId = useId();
  const confirmId = useId();
  const passwordErrorId = useId();
  const confirmErrorId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const checks = useMemo(() => passwordChecks(password), [password]);
  const passwordError = passwordTouched && (!checks.minLength || !checks.hasLetter || !checks.hasNumber)
    ? "Use at least 8 characters with a letter and a number."
    : undefined;
  const confirmError = confirmTouched && confirmPassword !== password ? "Passwords do not match." : undefined;
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordTouched(true);
    setConfirmTouched(true);
    if (!checks.minLength || !checks.hasLetter || !checks.hasNumber || password !== confirmPassword) return;
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    router.push("/auth/sign-in");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf8f3] p-5">
      <form onSubmit={submit} noValidate className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.1)]">
        <Link href="/auth/sign-in" className="font-bold text-teal-700">← Back to sign in</Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Create a strong password for your HomeFix account.</p>
        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor={passwordId} className="mb-1.5 block text-sm font-semibold text-slate-800">New password</label>
            <div className="relative">
              <Input
                id={passwordId}
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? passwordErrorId : `${passwordId}-hint`}
                onBlur={() => setPasswordTouched(true)}
                onChange={(event) => setPassword(event.target.value)}
                className={cn("h-12 pr-12", passwordError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-slate-800"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id={passwordErrorId} message={passwordError} />
            <ul id={`${passwordId}-hint`} className="mt-2 space-y-1 text-xs text-slate-500">
              <li className={checks.minLength ? "text-teal-700" : undefined}>At least 8 characters</li>
              <li className={checks.hasLetter ? "text-teal-700" : undefined}>Contains a letter</li>
              <li className={checks.hasNumber ? "text-teal-700" : undefined}>Contains a number</li>
            </ul>
          </div>
          <div>
            <label htmlFor={confirmId} className="mb-1.5 block text-sm font-semibold text-slate-800">Confirm password</label>
            <div className="relative">
              <Input
                id={confirmId}
                required
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                aria-invalid={Boolean(confirmError)}
                aria-describedby={confirmError ? confirmErrorId : undefined}
                onBlur={() => setConfirmTouched(true)}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={cn("h-12 pr-12", confirmError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-slate-800"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id={confirmErrorId} message={confirmError} />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="mt-6 h-12 w-full">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </main>
  );
}
