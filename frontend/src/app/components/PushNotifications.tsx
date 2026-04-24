"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {}
  };

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Les notifications push ne sont pas supportees sur ce navigateur.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;

      // VAPID public key · in production, fetch from /api/push/vapid-key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || "";

      if (!vapidKey) {
        // Fallback: just enable browser notifications without push server
        setSubscribed(true);
        // Send a test notification
        new Notification("PNPI", {
          body: "Notifications activees !",
          icon: "/icons/pnpi-192.png",
        });
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to backend
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setSubscribed(true);
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
    } catch {}
  };

  if (typeof window === "undefined" || !("Notification" in window)) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderRadius: 12,
        background: subscribed ? "rgba(0, 98, 51, 0.06)" : "var(--bg-base, #f4f8fb)",
        border: `1.5px solid ${subscribed ? "#006233" : "var(--line, #dce4ef)"}`,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{subscribed ? "\uD83D\uDD14" : "\uD83D\uDD15"}</span>
        <div>
          <div style={{ fontWeight: 600 }}>Notifications push</div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>
            {subscribed ? "Activees · vous recevrez des alertes en temps reel" : "Desactivees"}
          </div>
        </div>
      </div>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          background: subscribed ? "var(--bg-layer, #fff)" : "#006233",
          color: subscribed ? "var(--text-soft, #526175)" : "#fff",
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
          border: subscribed ? "1px solid var(--line, #dce4ef)" : "none",
        }}
      >
        {subscribed ? "Desactiver" : "Activer"}
      </button>
    </div>
  );
}
