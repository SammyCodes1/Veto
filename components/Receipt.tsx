"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ConfirmPayload = {
  accepted?: boolean;
  reason?: string;
  error?: string;
  blobId?: string | null;
  memoryError?: string | null;
  placed?: { timestampMs: number; chainBps: number; pickId: string };
};

export function Receipt({ digest }: { digest: string }) {
  const params = useSearchParams();
  const marketId = params.get("market") ?? "";
  const account = useCurrentAccount();
  const [payload, setPayload] = useState<ConfirmPayload | null>(null);

  useEffect(() => {
    if (!account || !marketId) return;
    let stopped = false;
    const run = async () => {
      const response = await fetch("/api/picks/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digest, marketId, address: account.address }),
      });
      const body = (await response.json()) as ConfirmPayload;
      if (stopped) return;
      setPayload(body);
      if (response.status === 202) window.setTimeout(run, 4000);
    };
    void run();
    return () => {
      stopped = true;
    };
  }, [account, digest, marketId]);

  return (
    <section className="receipt">
      <p className="meta">Receipt</p>
      <h1>{payload?.accepted ? "Logged." : payload?.reason ? "Not logged." : "Waiting on Tatum."}</h1>
      <p className="digest">{digest}</p>
      {!account ? <p className="notice">Connect the wallet that signed this pick.</p> : null}
      {!marketId ? <p className="notice">This receipt has no market id.</p> : null}
      {payload?.reason ? <p>{payload.reason}</p> : null}
      {payload?.error ? <p className="notice">{payload.error}</p> : null}
      {payload?.accepted ? (
        <>
          <p>Checkpoint time {payload.placed ? new Date(payload.placed.timestampMs).toISOString() : "pending"}.</p>
          <p>Entry captured at {payload.placed ? `${(payload.placed.chainBps / 100).toFixed(1)}¢` : "—"} on the yes side.</p>
          <p className="digest">Memory {payload.blobId ?? payload.memoryError ?? "still settling"}</p>
        </>
      ) : null}
      <p className="quiet">Object {payload?.placed?.pickId ?? "—"} · <a href={`https://suivision.xyz/txblock/${digest}`}>Suivision</a></p>
      <p className="quiet">After Tatum resolves the market, grade the object from the record. That second signature is what enters the cell.</p>
    </section>
  );
}
