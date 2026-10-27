"use client";

import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";

type Suggestion = {
  ready: boolean;
  yesWins?: boolean;
  closeBps?: number;
};

export function GradeButton({ pickId, side, suggestion }: { pickId: string; side: number; suggestion: Suggestion | null }) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [note, setNote] = useState("");
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID ?? "";
  const ready = Boolean(suggestion?.ready && suggestion.closeBps !== undefined && suggestion.yesWins !== undefined);

  async function grade() {
    if (!account || !suggestion?.ready || suggestion.closeBps === undefined || suggestion.yesWins === undefined) return;
    setNote("");
    const won = side === 1 ? suggestion.yesWins : !suggestion.yesWins;
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::pick::grade`,
      arguments: [tx.object(pickId), tx.pure.u64(suggestion.closeBps), tx.pure.u8(won ? 1 : 2)],
    });
    try {
      const signed = await signAndExecute({ transaction: tx });
      const response = await fetch("/api/picks/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digest: signed.digest, address: account.address }),
      });
      const body = (await response.json()) as { accepted?: boolean; reason?: string; error?: string; clause?: string; blobId?: string | null };
      if (!response.ok || body.accepted === false) {
        setNote(body.reason || body.error || "Tatum did not accept the grade.");
        return;
      }
      setNote(body.clause || "Graded.");
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : "The wallet did not sign.");
    }
  }

  if (!packageId) return <span className="quiet">Package not published</span>;
  if (!ready) return <span className="quiet">Not resolved</span>;

  return (
    <span className="grade">
      <button className="lock" type="button" disabled={!account || isPending} onClick={grade}>
        {isPending ? "Waiting for the wallet" : "Grade"}
      </button>
      {note ? <span className="quiet">{note}</span> : null}
    </span>
  );
}
