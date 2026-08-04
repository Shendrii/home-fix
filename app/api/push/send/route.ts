import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

type SendBody = {
  company_id?: string;
  service_request_id?: string;
  offer_id?: string;
};

/**
 * Internal endpoint. Called only by the `dispatch_offer_push_nudge` Postgres
 * trigger (via pg_net) whenever a new exclusive offer is created — never
 * called directly by the browser. Authenticated with a shared secret rather
 * than a user session since the caller is the database itself.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_INTERNAL_SECRET;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:ops@example.com";

  if (!secret || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "Push not configured on this deployment." }, { status: 503 });
  }

  if (request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration missing." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as SendBody | null;
  if (!body?.company_id) {
    return NextResponse.json({ error: "Missing company_id." }, { status: 400 });
  }

  const { data: company } = await admin.from("companies").select("owner_id").eq("id", body.company_id).single();
  if (!company?.owner_id) {
    return NextResponse.json({ ok: true, sent: 0, reason: "company_not_found" });
  }

  const { data: request_row } = body.service_request_id
    ? await admin.from("service_requests").select("title").eq("id", body.service_request_id).single()
    : { data: null };

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", company.owner_id);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_subscriptions" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const payload = JSON.stringify({
    title: "New priority job offer",
    body: request_row?.title ? `${request_row.title} — reserved for a short decision window.` : "A job matching your services is reserved for you.",
    url: "/partner",
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  return NextResponse.json({ ok: true, sent });
}
