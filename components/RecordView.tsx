"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GradeButton } from "@/components/GradeButton";
import { signed, Stamp } from "@/components/Stamp";
import type { Decision, SeedTicket } from "@/lib/types";

type Suggestion = { ready: boolean; yesWins?: boolean; closeBps?: number };

type LivePick = {
  pickId: string;
  cell: string;
  side: number;
  title: string;
  outcome: number;
  clvPp: number | null;
  digest: string;
  suggestion: Suggestion | null;
};

type RecordPayload = {
  cells: Array<{ cell: string; decision: Decision; tickets: SeedTicket[] }>;
  live: LivePick[];
  error?: string;
  liveError?: string;
};

export function RecordView() {
  const params = useSearchParams();
  const memoryOff = params.get("memory") === "off";
  const account = useCurrentAccount();
  const [payload, setPayload] = useState<RecordPayload | null>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    if (memoryOff) query.set("memory", "off");
    if (account?.address) query.set("address", account.address);
    fetch(`/api/record?${query.toString()}`)
      .then((response) => response.json())
      .then(setPayload)
      .catch(() => setPayload({ cells: [], live: [], error: "The record could not be loaded." }));
  }, [memoryOff, account?.address]);

  if (!payload) return <p className="quiet">Opening the record.</p>;
  if (payload.error) return <p className="notice">{payload.error}</p>;

  return (
    <section className="cells">
      {payload.liveError ? <p className="notice">{payload.liveError}</p> : null}
      {payload.cells.map((cell) => (
        <article className="cell" key={cell.cell}>
          <header>
            <h2>{cell.cell}</h2>
            <Stamp name={cell.decision.stamp} />
          </header>
          <p className="meta">{cell.decision.samples} graded · mean {signed(cell.decision.meanClv)}</p>
          <pre className="memory">{cell.decision.clause}</pre>
          <table>
            <thead>
              <tr><th>Ticket</th><th>CLV</th><th>Result</th><th></th></tr>
            </thead>
            <tbody>
              {cell.tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.title}</td>
                  <td>{signed(ticket.clvPp)}</td>
                  <td>{ticket.result}</td>
                  <td className="tag">seed</td>
                </tr>
              ))}
              {payload.live.filter((pick) => pick.cell === cell.cell).map((pick) => (
                <tr key={pick.pickId}>
                  <td>{pick.title}</td>
                  <td>{pick.clvPp === null ? "open" : signed(pick.clvPp)}</td>
                  <td>{pick.outcome === 1 ? "won" : pick.outcome === 2 ? "lost" : "open"}</td>
                  <td>
                    {pick.outcome === 0 ? (
                      <GradeButton pickId={pick.pickId} side={pick.side} suggestion={pick.suggestion} />
                    ) : (
                      <a href={`https://suivision.xyz/object/${pick.pickId}`}>onchain</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </section>
  );
}
