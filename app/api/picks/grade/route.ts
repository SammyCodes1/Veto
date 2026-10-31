import { fromBps } from "@/lib/clv";
import { decide } from "@/lib/decision";
import { gradedTickets, slateById } from "@/lib/boardData";
import { remember } from "@/lib/memory";
import { cellRuleMemory, liveGradeMemory } from "@/lib/memoryText";
import { gradeMatchesTatum, liveClv, readOwnedPicks } from "@/lib/rpc";
import { chainPrice, marketFacts, suiRpc } from "@/lib/tatum";

export const maxDuration = 60;

type GradeTx = {
  events?: Array<{ type?: string; parsedJson?: Record<string, unknown> }>;
  transaction?: { data?: { sender?: string } };
};

export async function POST(request: Request) {
  const body = (await request.json()) as { digest?: string; address?: string };
  const digest = body.digest?.trim() ?? "";
  const address = body.address?.trim().toLowerCase() ?? "";
  const packageId = process.env.VETO_PACKAGE_ID;
  if (!packageId) return Response.json({ error: "The Move package is not published yet." }, { status: 503 });
  if (!digest || !address) return Response.json({ error: "Digest and address are required." }, { status: 400 });

  try {
    const tx = await suiRpc<GradeTx>("sui_getTransactionBlock", [
      digest,
      { showInput: true, showEvents: true },
    ]);
    const event = tx.events?.find((item) => item.type === `${packageId}::pick::PickGraded`);
    const pickId = String(event?.parsedJson?.pick_id ?? event?.parsedJson?.pickId ?? "");
    if (!pickId) {
      return Response.json({ accepted: false, reason: "Tatum has not returned a grade event for that digest yet." }, { status: 202 });
    }
    const sender = (tx.transaction?.data?.sender ?? "").toLowerCase();
    if (sender !== address) {
      return Response.json({ accepted: false, reason: "The sender does not match this wallet." }, { status: 403 });
    }

    const owned = await readOwnedPicks(address, packageId);
    const pick = owned.find((item) => item.pickId === pickId);
    if (!pick || pick.outcome === 0) {
      return Response.json({ accepted: false, reason: "The graded object is not readable yet." }, { status: 202 });
    }
    const row = await slateById(pick.marketId);
    const polymarketId = row?.polymarketId ?? pick.marketId;
    const title = row?.title ?? pick.marketId;

    const facts = await marketFacts(polymarketId);
    const quote = await chainPrice(polymarketId);
    if (facts.yesWins === null || quote.yes === null) {
      return Response.json({ accepted: false, reason: "Tatum has not published a resolution for this market." }, { status: 409 });
    }
    if (!gradeMatchesTatum(pick, quote.yes)) {
      return Response.json(
        { accepted: false, reason: "The close on the object disagrees with Tatum by more than a point. The cell ignored it." },
        { status: 422 },
      );
    }
    const won = pick.side === 1 ? facts.yesWins : !facts.yesWins;
    if ((won && pick.outcome !== 1) || (!won && pick.outcome !== 2)) {
      return Response.json({ accepted: false, reason: "The outcome on the object does not match Tatum." }, { status: 422 });
    }

    const all = await gradedTickets(false, address);
    const before = decide(all.filter((ticket) => ticket.id !== pick.pickId), pick.cell).stamp;
    const clv = liveClv(pick) ?? 0;
    const text = liveGradeMemory({
      id: pick.pickId,
      cell: pick.cell,
      marketId: pick.marketId,
      title,
      side: pick.side === 1 ? "YES" : "NO",
      bookBps: pick.bookBps,
      chainBps: pick.chainBps,
      closeBps: pick.closeBps,
      clvPp: clv,
      result: won ? "won" : "lost",
      digest,
    });
    const blobId = await remember(text, "veto.tickets");
    const after = decide(all, pick.cell);
    let ruleBlobId: string | null = null;
    if (after.stamp !== before) {
      ruleBlobId = await remember(cellRuleMemory(pick.cell, after), "veto.cells");
    }
    return Response.json({
      accepted: true,
      stamp: after.stamp,
      clause: after.clause,
      clvPp: clv,
      close: fromBps(pick.closeBps),
      blobId,
      ruleBlobId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grade failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
