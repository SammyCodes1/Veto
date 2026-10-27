import { board } from "@/lib/boardData";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memoryOff = url.searchParams.get("memory") === "off";
  const address = url.searchParams.get("address") || undefined;
  try {
    return Response.json(await board(memoryOff, address));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Board failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
