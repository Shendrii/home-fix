import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isClientBookingPath, safeReturnTo } from "@/lib/auth-return";
import {
  isRecentlyCreatedAuthUser,
  oauthNoAccountSignInPath,
  parseOAuthIntent,
} from "@/lib/oauth-callback";
import { profileNeedsPersonalDetails } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

function roleHome(role: string | null | undefined) {
  if (role === "partner") return "/partner";
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

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
  response.headers.set(
    "Location",
    oauthNoAccountSignInPath(request.nextUrl.origin, options.returnTo).toString(),
  );
  return response;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeReturnTo(url.searchParams.get("next"));
  const intent = parseOAuthIntent(url.searchParams.get("intent"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !supabaseUrl || !key) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=configuration", url.origin));
  }

  const response = NextResponse.redirect(new URL(next ?? "/dashboard", url.origin));
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
    return NextResponse.redirect(new URL("/auth/sign-in?error=auth", url.origin));
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

  const role = profile?.role;

  let destination: string;
  if (next) {
    const allowNext = role === "client" && isClientBookingPath(next);
    destination = allowNext ? next : roleHome(role);
  } else if (!profile) {
    destination = "/account";
  } else if (role === "client" && profileNeedsPersonalDetails(profile)) {
    destination = "/account";
  } else {
    destination = roleHome(role);
  }

  response.headers.set("Location", new URL(destination, url.origin).toString());
  return response;
}
