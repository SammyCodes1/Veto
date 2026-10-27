import { fromBps } from "./clv";
import { decisionsFor, gradedFromSeed, ticketsInCell } from "./ledger";
import { currentSlate, stillOpen } from "./liveSlate";
import { bookProbability, oddsConfigured } from "./odds";
import { liveClv, readOwnedPicks, type OwnedPick } from "./rpc";
import { chainHistory, chainPrice, tatumConfigured } from "./tatum";
import type { CellId, Decision, GradedTicket, SlateRow } from "./types";

export async function slateRows(): Promise<SlateRow[]> {
  return stillOpen(await currentSlate());
}

export async function slateById(id: string): Promise<SlateRow | undefined> {
  const rows = await currentSlate();
  return rows.find((row) => row.id === id || row.polymarketId === id);
}

export async function gradedTickets(memoryOff: boolean, address?: string): Promise<GradedTicket[]> {
  const tickets = gradedFromSeed(memoryOff);
  if (memoryOff || !address || !tatumConfigured() || !process.env.VETO_PACKAGE_ID) return tickets;
  const owned = await readOwnedPicks(address, process.env.VETO_PACKAGE_ID);
  for (const pick of owned) {
    const clv = liveClv(pick);
    if (clv === null) continue;
    tickets.push({
      id: pick.pickId,
      cell: pick.cell,
      clvPp: clv,
      won: pick.outcome === 1,
    });
  }
  return tickets;
}

export async function board(memoryOff: boolean, address?: string) {
  const tickets = await gradedTickets(memoryOff, address);
  const decisions = decisionsFor(tickets, memoryOff);
  const rows = [];
  for (const row of await slateRows()) {
    rows.push(await priceRow(row, decisions[row.cell]));
  }
  return {
    rows,
    decisions,
    tatum: tatumConfigured(),
    odds: oddsConfigured(),
    memoryOff,
  };
}

export async function marketView(id: string, memoryOff: boolean, address?: string) {
  const row = await slateById(id);
  if (!row) return null;
  const tickets = await gradedTickets(memoryOff, address);
  const decision = decisionsFor(tickets, memoryOff)[row.cell];
  let history: { t: number; p: number }[] = [];
  if (tatumConfigured()) {
    try {
      history = await chainHistory(row.polymarketId);
    } catch {
      history = [];
    }
  }
  return { ...(await priceRow(row, decision)), history };
}

async function priceRow(row: SlateRow, decision: Decision) {
  let chain: number | null = null;
  let book: number | null = null;
  let bookOffline = !oddsConfigured();
  if (tatumConfigured()) {
    try {
      const quote = await chainPrice(row.polymarketId);
      chain = quote.yes;
    } catch {
      chain = null;
    }
  }
  if (oddsConfigured()) {
    try {
      book = await bookProbability(row);
      bookOffline = book === null;
    } catch {
      book = null;
      bookOffline = true;
    }
  }
  return { ...row, chain, book, bookOffline, decision };
}

export function record(memoryOff: boolean) {
  const tickets = gradedFromSeed(memoryOff);
  const decisions = decisionsFor(tickets, memoryOff);
  return {
    cells: (Object.keys(decisions) as CellId[]).map((cell) => ({
      cell,
      decision: decisions[cell],
      tickets: memoryOff ? [] : ticketsInCell(cell),
    })),
  };
}

export function bpsOrNull(prob: number | null): number | null {
  return prob === null ? null : Math.round(prob * 10_000);
}

export { fromBps };
export type { OwnedPick };
