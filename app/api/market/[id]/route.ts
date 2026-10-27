import { marketView } from "@/lib/boardData";
import { recallTexts } from "@/lib/memory";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const memoryOff = url.searchParams.get("memory") === "off";
  const address = url.searchParams.get("address") || undefined;
  try {
    const market = await marketView(decodeURIComponent(id), memoryOff, address);
    if (!market) return Response.json({ error: "That market is not on the slate." }, { status: 404 });
    let memories: string[] = [];
    let memorySettling = false;
    if (!memoryOff) {
      try {
        memories = await recallTexts(`CELL ${market.cell} stamp`, "veto.cells");
      } catch {
        memorySettling = true;
      }
    }
    return Response.json({ ...market, memories, memorySettling });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
