"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Opt-in control for the exclusive-offer web push nudge. Kept as a small,
 * self-contained widget — registering the service worker and subscribing
 * are one-time browser actions independent of anything else on the page.
 */
export function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      setSupported(
        typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Boolean(vapidPublicKey),
      );
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    })();
  }, []);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications blocked", { description: "Enable notifications in your browser settings to receive offer nudges." });
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      const supabase = createClient();
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error);
      }
      setSubscribed(true);
      toast.success("Offer nudges enabled", { description: "You'll get a browser notification when a priority job is offered to you." });
    } catch (error) {
      toast.error("Couldn’t enable notifications", {
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <Button
      variant={subscribed ? "outline" : "secondary"}
      size="sm"
      disabled={busy}
      onClick={() => void (subscribed ? disable() : enable())}
    >
      {subscribed ? <BellOff /> : <Bell />}
      {subscribed ? "Notifications on" : "Get offer alerts"}
    </Button>
  );
}
