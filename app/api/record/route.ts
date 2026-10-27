import { record, slateById } from "@/lib/boardData";
import { liveClv, readOwnedPicks } from "@/lib/rpc";
import { chainPrice, marketFacts, tatumConfigured } from "@/lib/tatum";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memoryOff = url.searchParams.get("memory") === "off";
  const address = url.searchParams.get("address") || "";
  const body = record(memoryOff);
  if (memoryOff || !address || !tatumConfigured() || !process.env.VETO_PACKAGE_ID) {
    return Response.json({ ...body, live: [] });
  }
  try {
    const owned = await readOwnedPicks(address, process.env.VETO_PACKAGE_ID);
    const live = [];
    for (const pick of owned) {
      live.push({
        ...pick,
        clvPp: liveClv(pick),
        title: (await slateById(pick.marketId))?.title ?? pick.marketId,
        suggestion: pick.outcome === 0 ? await suggestionFor(pick.marketId) : null,
      });
    }
    return Response.json({ ...body, live });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live picks could not be read.";
    return Response.json({ ...body, live: [], liveError: message });
  }
}

async function suggestionFor(marketId: string): Promise<{ ready: boolean; yesWins?: boolean; closeBps?: number } | null> {
  const row = await slateById(marketId);
  if (!row) return null;
  try {
    const facts = await marketFacts(row.polymarketId);
    const quote = await chainPrice(row.polymarketId);
    if (facts.yesWins === null || quote.yes === null) return { ready: false };
    return { ready: true, yesWins: facts.yesWins, closeBps: Math.round(quote.yes * 10_000) };
  } catch {
    return { ready: false };
  }
}
