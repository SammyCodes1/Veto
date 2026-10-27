import seed from "../data/seed-tickets.json";
import { decide } from "./decision";
import type { CellId, Decision, GradedTicket, SeedTicket } from "./types";
import { CELLS } from "./types";

export function seedTickets(): SeedTicket[] {
  return seed.tickets as SeedTicket[];
}

export function gradedFromSeed(memoryOff: boolean): GradedTicket[] {
  if (memoryOff) return [];
  return seedTickets().map((ticket) => ({
    id: ticket.id,
    cell: ticket.cell,
    clvPp: ticket.clvPp,
    won: ticket.result === "won",
  }));
}

export function decisionsFor(tickets: GradedTicket[], memoryOff: boolean): Record<CellId, Decision> {
  return Object.fromEntries(CELLS.map((cell) => [cell, decide(tickets, cell, memoryOff)])) as Record<CellId, Decision>;
}

export function ticketsInCell(cell: CellId): SeedTicket[] {
  return seedTickets().filter((ticket) => ticket.cell === cell);
}
