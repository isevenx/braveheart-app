"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/actions";
import { BellIcon } from "@/components/Icons";

type State = "loading" | "unsupported" | "needs-install" | "off" | "on" | "blocked";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Turns big-day and booking push alerts on for this device.
 * iPhone requires the app to be added to the Home Screen first (iOS 16.4+).
 */
export function PushToggle({ vapidKey }: { vapidKey: string | undefined }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) {
        setState(ios && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapidKey]);

  async function toggle() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (state === "on") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setState("blocked");
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
        await savePushSubscription(JSON.parse(JSON.stringify(sub)));
        setState("on");
      }
    } finally {
      setBusy(false);
    }
  }

  const note: Record<State, string> = {
    loading: "Checking…",
    unsupported: "This browser doesn't support push alerts. You'll still get emails.",
    "needs-install": "On iPhone: tap Share, then Add to Home Screen, and open Braveheart from there to turn on alerts.",
    off: "Get a nudge before big days, and when a repeat cut is booked or needs a new time.",
    on: "Alerts are on for this device.",
    blocked: "Notifications are blocked. Turn them on for this site in your browser or phone settings.",
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <BellIcon size={20} className="mt-0.5 flex-none text-forest" />
      <div className="flex flex-1 flex-col gap-1">
        <strong className="text-[14px] font-semibold">Push alerts</strong>
        <span className="text-[12px] leading-[1.45] text-muted">{note[state]}</span>
      </div>
      {(state === "on" || state === "off") && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`h-9 flex-none rounded-full px-3.5 text-[12px] font-semibold ${state === "on" ? "border-[1.5px] border-line" : "bg-gold"}`}
        >
          {state === "on" ? "Turn off" : "Turn on"}
        </button>
      )}
    </div>
  );
}
