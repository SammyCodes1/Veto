"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { price, signed, Stamp } from "@/components/Stamp";
import type { Decision, SlateRow } from "@/lib/types";

type BoardRow = SlateRow & {
  chain: number | null;
  book: number | null;
  bookOffline: boolean;
  decision: Decision;
};

type BoardPayload = {
  rows: BoardRow[];
  tatum: boolean;
  odds: boolean;
  error?: string;
};

export function ColdStart() {
  const params = useSearchParams();
  const memoryOff = params.get("memory") === "off";
  return (
    <Link className="switch" href={memoryOff ? "/board" : "/board?memory=off"}>
      {memoryOff ? "Show the record" : "Cold start"}
    </Link>
  );
}

export function Board() {
  const params = useSearchParams();
  const memoryOff = params.get("memory") === "off";
  const account = useCurrentAccount();
  const [payload, setPayload] = useState<BoardPayload | null>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    if (memoryOff) query.set("memory", "off");
    if (account?.address) query.set("address", account.address);
    fetch(`/api/board?${query.toString()}`)
      .then((response) => response.json())
      .then(setPayload)
      .catch(() => setPayload({ rows: [], tatum: false, odds: false, error: "The board could not be loaded." }));
  }, [memoryOff, account?.address]);

  return (
    <>
      {memoryOff ? <p className="notice">Cold start. The record is hidden, not deleted.</p> : null}
      {payload && !payload.tatum ? (
        <p className="notice">Chain prices need a Tatum key in TATUM_API_KEY. The stamps still read the seeded record.</p>
      ) : null}
      {payload && !payload.odds ? (
        <p className="notice">Book prices need an Odds API key. A market with no book cannot be logged.</p>
      ) : null}
      {!payload ? <p className="quiet">Opening the board.</p> : null}
      {payload?.error ? <p className="notice">{payload.error}</p> : null}
      {payload && payload.rows.length === 0 ? (
        <p className="notice">No open markets are on the slate. Run pnpm build-seed, or the listed games have already closed.</p>
      ) : null}
      <div className="list">
        {payload?.rows.map((row) => {
          const action = row.decision.stamp === "VETO"
            ? "Blocked"
            : row.book === null || row.bookOffline
              ? "Book offline"
              : row.chain === null
                ? "Chain offline"
                : "Log";
          return (
            <Link className={row.decision.stamp === "VETO" ? "game game-dead" : "game"} key={row.id} href={`/m/${row.id}${memoryOff ? "?memory=off" : ""}`}>
              <div className="game-top">
                <span className="kicker">{row.cell}</span>
                <Stamp name={row.decision.stamp} />
              </div>
              <h2>{row.title}</h2>
              <div className="scoreline">
                <div><span>Book</span><strong>{price(row.book)}</strong></div>
                <div><span>Chain</span><strong>{price(row.chain)}</strong></div>
              </div>
              <div className="game-foot">
                <span>{row.decision.samples} graded · {signed(row.decision.meanClv)} clv</span>
                <span className="pill">{action}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
