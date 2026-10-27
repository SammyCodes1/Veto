import { slateById } from "@/lib/boardData";

export const maxDuration = 60;
import { remember } from "@/lib/memory";
import { livePlacementMemory } from "@/lib/memoryText";
import { readPlacement } from "@/lib/rpc";

export async function POST(request: Request) {
  const body = (await request.json()) as { digest?: string; marketId?: string; address?: string };
  const digest = body.digest?.trim() ?? "";
  const marketId = body.marketId?.trim() ?? "";
  const address = body.address?.trim().toLowerCase() ?? "";
  const packageId = process.env.VETO_PACKAGE_ID;
  if (!packageId) return Response.json({ error: "The Move package is not published yet." }, { status: 503 });
  const row = await slateById(marketId);
  if (!row) return Response.json({ error: "That market is not on the slate." }, { status: 404 });
  if (!digest || !address) return Response.json({ error: "Digest and address are required." }, { status: 400 });

  try {
    const placed = await readPlacement(digest, packageId);
    if (!placed) {
      return Response.json({ accepted: false, reason: "Tatum has not returned a Veto placement for that digest yet." }, { status: 202 });
    }
    if (placed.sender.toLowerCase() !== address) {
      return Response.json({ accepted: false, reason: "The sender does not match this wallet." }, { status: 403 });
    }
    if (placed.marketId !== row.polymarketId) {
      return Response.json({ accepted: false, reason: "That transaction belongs to a different market." }, { status: 422 });
    }
    if (!(placed.timestampMs < Date.parse(row.closeTime))) {
      return Response.json(
        { accepted: false, reason: "The transaction landed after the close. Nothing was remembered." },
        { status: 409 },
      );
    }

    const text = livePlacementMemory({
      id: placed.pickId,
      cell: placed.cell,
      marketId: placed.marketId,
      title: row.title,
      side: placed.side === 1 ? "YES" : "NO",
      bookBps: placed.bookBps,
      chainBps: placed.chainBps,
      digest,
    });
    let blobId: string | null = null;
    let memoryError: string | null = null;
    try {
      blobId = await remember(text, "veto.tickets");
      if (!blobId) memoryError = "Walrus Memory credentials are not set, so the receipt has no blob yet.";
    } catch (error) {
      memoryError = error instanceof Error ? error.message : "Memory write failed.";
    }
    return Response.json({ accepted: true, placed, blobId, memoryError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirmation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
