"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import { useEffect, useState } from "react";

type ClosedPick = {
  pickId: string;
  title: string;
  outcome: number;
  suggestion: { closed?: boolean; ready?: boolean } | null;
};

export function ClosedNotice() {
  const account = useCurrentAccount();
  const [picks, setPicks] = useState<ClosedPick[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!account?.address) {
      setPicks([]);
      return;
    }
    let stopped = false;
    const announced = new Set<string>();
    const load = async () => {
      const response = await fetch(`/api/record?address=${account.address}`);
      const body = (await response.json()) as { live?: ClosedPick[] };
      if (stopped) return;
      const closed = (body.live ?? []).filter((pick) => pick.outcome === 0 && pick.suggestion?.closed);
      setPicks(closed);
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      for (const pick of closed) {
        if (announced.has(pick.pickId)) continue;
        announced.add(pick.pickId);
        const ready = pick.suggestion?.ready;
        new Notification(`${pick.title} has closed`, {
          body: ready ? "Grade the pick on the record." : "The result is not in yet.",
        });
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [account?.address]);

  if (!picks.length) return null;
  const ready = picks.some((pick) => pick.suggestion?.ready);
  const names = picks.map((pick) => pick.title).join(", ");

  return (
    <p className="alert" role="status">
      {names} {picks.length === 1 ? "has" : "have"} closed.
      {ready ? " Grade the pick." : " The result is not in yet."}{" "}
      <Link href="/record">Open the record</Link>
      {permission === "default" ? (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            void Notification.requestPermission().then(setPermission);
          }}
        >
          Allow alerts
        </button>
      ) : null}
    </p>
  );
}
