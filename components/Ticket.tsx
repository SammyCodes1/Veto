"use client";

import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { price, Stamp } from "@/components/Stamp";
import { gapSentence } from "@/lib/display";
import type { Decision, SlateRow } from "@/lib/types";

type MarketPayload = SlateRow & {
  chain: number | null;
  book: number | null;
  bookOffline: boolean;
  decision: Decision;
  history: { t: number; p: number }[];
  memories: string[];
  memorySettling: boolean;
  error?: string;
};

const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID ?? "";

export function Ticket({ id }: { id: string }) {
  const params = useSearchParams();
  const memoryOff = params.get("memory") === "off";
  const account = useCurrentAccount();
  const router = useRouter();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [market, setMarket] = useState<MarketPayload | null>(null);
  const [side, setSide] = useState<1 | 0>(1);
  const [size, setSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams();
    if (memoryOff) query.set("memory", "off");
    if (account?.address) query.set("address", account.address);
    fetch(`/api/market/${id}?${query.toString()}`)
      .then((response) => response.json())
      .then(setMarket)
      .catch(() => setError("This market could not be loaded."));
  }, [id, memoryOff, account?.address]);

  if (error) return <p className="notice">{error}</p>;
  if (!market) return <p className="quiet">Reading the market.</p>;
  if (market.error) return <p className="notice">{market.error}</p>;

  const bookMissing = market.book === null;
  const chainMissing = market.chain === null;
  const veto = market.decision.stamp === "VETO";
  const locked = veto || bookMissing || chainMissing || !packageId || !account || isPending;
  const label = veto
    ? "Vetoed"
    : bookMissing
      ? "Book offline"
      : chainMissing
        ? "Chain offline"
        : !packageId
          ? "Package not published"
          : !account
            ? "Connect a wallet"
            : "Lock pick";

  async function lock() {
    if (!market || !account || market.book === null || market.chain === null) return;
    setError("");
    const tx = new Transaction();
    const pick = tx.moveCall({
      target: `${packageId}::pick::place`,
      arguments: [
        tx.pure.string(market.polymarketId),
        tx.pure.string(market.cell),
        tx.pure.u8(side),
        tx.pure.u64(Math.round(market.book * 10_000)),
        tx.pure.u64(Math.round(market.chain * 10_000)),
        tx.pure.u64(Math.max(1, Math.round(size))),
      ],
    });
    tx.transferObjects([pick], account.address);
    try {
      const result = await signAndExecute({ transaction: tx });
      router.push(`/receipt/${result.digest}?market=${market.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The wallet did not sign.");
    }
  }

  return (
    <article className="ticket">
      <div>
        <p className="meta">{market.cell}</p>
        <h1>{market.title}</h1>
        <p className="gap">{gapSentence(market.chain, market.book)}</p>
        <Sparkline points={market.history} />
        <p className="prices">Book {price(market.book)} · Chain {price(market.chain)} · {market.yesLabel} / {market.noLabel}</p>
      </div>
      <div className="controls">
        <Stamp name={market.decision.stamp} />
        <p>{market.decision.clause}</p>
        {market.memorySettling ? <p className="quiet">Memory is still settling.</p> : null}
        <div className="quotes">
          {market.memories.slice(0, 2).map((memory) => <pre key={memory}>{memory}</pre>)}
        </div>
        <div className="side">
          <button type="button" data-on={side === 1} onClick={() => setSide(1)}>{market.yesLabel}</button>
          <button type="button" data-on={side === 0} onClick={() => setSide(0)}>{market.noLabel}</button>
        </div>
        <label>
          Declared size
          <input type="number" min={1} value={size} onChange={(event) => setSize(Number(event.target.value))} />
        </label>
        <button className="lock" type="button" disabled={locked} onClick={lock}>{isPending ? "Waiting for the wallet" : label}</button>
        <p className="quiet">This writes a Sui object. The log counts only if Tatum reads it back before the close.</p>
        {error ? <p className="notice">{error}</p> : null}
      </div>
    </article>
  );
}

function Sparkline({ points }: { points: { t: number; p: number }[] }) {
  if (points.length < 2) return null;
  const values = points.map((point) => point.p);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 28 - ((value - min) / span) * 24;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 32" role="img" aria-label="Chain price history">
      <polyline points={d} />
    </svg>
  );
}
