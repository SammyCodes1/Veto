import { formatClv } from "./decision";
import type { CellId, Decision, SeedTicket } from "./types";

export function ticketMemory(ticket: SeedTicket): string {
  return [
    `TICKET ${ticket.id}`,
    `origin ${ticket.origin}`,
    `cell ${ticket.cell}`,
    `market ${ticket.marketId}`,
    `title ${ticket.title}`,
    `side ${ticket.side}`,
    `book_bps ${ticket.bookBps ?? "none"} chain_bps ${ticket.chainBps} close_bps ${ticket.closeBps}`,
    `clv_pp ${formatClv(ticket.clvPp)}`,
    `result ${ticket.result}`,
    `tx seed`,
  ].join("\n");
}

export function livePlacementMemory(input: {
  id: string;
  cell: CellId;
  marketId: string;
  title: string;
  side: "YES" | "NO";
  bookBps: number;
  chainBps: number;
  digest: string;
}): string {
  return [
    `TICKET ${input.id}`,
    "origin live",
    "status open",
    `cell ${input.cell}`,
    `market ${input.marketId}`,
    `title ${input.title}`,
    `side ${input.side}`,
    `book_bps ${input.bookBps} chain_bps ${input.chainBps} close_bps 0`,
    "clv_pp open",
    "result open",
    `tx ${input.digest}`,
  ].join("\n");
}

export function liveGradeMemory(input: {
  id: string;
  cell: CellId;
  marketId: string;
  title: string;
  side: "YES" | "NO";
  bookBps: number;
  chainBps: number;
  closeBps: number;
  clvPp: number;
  result: "won" | "lost";
  digest: string;
}): string {
  return [
    `TICKET ${input.id}`,
    "origin live",
    "status graded",
    `cell ${input.cell}`,
    `market ${input.marketId}`,
    `title ${input.title}`,
    `side ${input.side}`,
    `book_bps ${input.bookBps} chain_bps ${input.chainBps} close_bps ${input.closeBps}`,
    `clv_pp ${formatClv(input.clvPp)}`,
    `result ${input.result}`,
    `tx ${input.digest}`,
  ].join("\n");
}

export function cellRuleMemory(cell: CellId, decision: Decision): string {
  return [
    `CELL ${cell}`,
    `samples ${decision.samples}`,
    `mean_clv_pp ${formatClv(decision.meanClv)}`,
    `stamp ${decision.stamp}`,
    `rule ${decision.clause}`,
  ].join("\n");
}
