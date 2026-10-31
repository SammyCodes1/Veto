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
      const suggestion = pick.outcome === 0 ? await suggestionFor(pick.marketId) : null;
      const slate = await slateById(pick.marketId);
      live.push({
        ...pick,
        clvPp: liveClv(pick),
        title: slate?.title ?? suggestion?.question ?? pick.marketId,
        suggestion,
      });
    }
    return Response.json({ ...body, live });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live picks could not be read.";
    return Response.json({ ...body, live: [], liveError: message });
  }
}

async function suggestionFor(marketId: string): Promise<{ ready: boolean; closed: boolean; question: string | null; yesWins?: boolean; closeBps?: number }> {
  try {
    const facts = await marketFacts(marketId);
    const quote = await chainPrice(marketId);
    const pastClose = facts.closeTime !== null && Date.parse(facts.closeTime) <= Date.now();
    const closed = facts.yesWins !== null || facts.status.toLowerCase().includes("resolved") || pastClose;
    if (facts.yesWins === null || quote.yes === null) return { ready: false, closed, question: facts.question };
    return { ready: true, closed: true, question: facts.question, yesWins: facts.yesWins, closeBps: Math.round(quote.yes * 10_000) };
  } catch {
    return { ready: false, closed: false, question: null };
  }
}
