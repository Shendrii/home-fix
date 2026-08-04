import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { postAuthDestination } from "@/lib/auth-return";
import {
  authErrorToSignInParam,
  isRecentlyCreatedAuthUser,
  oauthNoAccountSignInPath,
} from "@/lib/oauth-callback";
import { clearOAuthResumeCookies, readOAuthResumeFromRequest } from "@/lib/oauth-resume-cookie";
import { createAdminClient } from "@/lib/supabase/admin";

async function rejectOAuthSignIn(
  request: NextRequest,
  response: NextResponse,
  supabase: ReturnType<typeof createServerClient>,
  options: { deleteUserId?: string; returnTo?: string | null },
) {
  await supabase.auth.signOut();
  if (options.deleteUserId) {
    const admin = createAdminClient();
    if (admin) {
      await admin.auth.admin.deleteUser(options.deleteUserId);
    }
  }
  clearOAuthResumeCookies(response);
  response.headers.set(
    "Location",
    oauthNoAccountSignInPath(request.nextUrl.origin, options.returnTo).toString(),
  );
  return response;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    const param = authErrorToSignInParam(url.searchParams.get("error_code"));
    return NextResponse.redirect(new URL(`/auth/sign-in?error=${param}`, url.origin));
  }

  const { intent, next } = readOAuthResumeFromRequest(request, url);
  const code = url.searchParams.get("code");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !supabaseUrl || !key) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=configuration", url.origin));
  }

  const response = NextResponse.redirect(new URL("/dashboard", url.origin));
  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !exchange.user) {
    const param =
      error?.code === "flow_state_already_used" ||
      error?.message?.toLowerCase().includes("already been used")
        ? "oauth_retry"
        : "auth";
    return NextResponse.redirect(new URL(`/auth/sign-in?error=${param}`, url.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, phone, default_address")
    .eq("id", exchange.user.id)
    .maybeSingle();

  if (intent === "signin") {
    const provisionedNow = isRecentlyCreatedAuthUser(exchange.user);
    if (provisionedNow) {
      return rejectOAuthSignIn(request, response, supabase, {
        deleteUserId: exchange.user.id,
        returnTo: next,
      });
    }
    if (!profile) {
      return rejectOAuthSignIn(request, response, supabase, { returnTo: next });
    }
  }

  const finalDestination = postAuthDestination(profile, next);
  clearOAuthResumeCookies(response);
  response.headers.set("Location", new URL(finalDestination, url.origin).toString());
  return response;
}
