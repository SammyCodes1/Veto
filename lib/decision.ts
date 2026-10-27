import { roundPp } from "./clv";
import type { CellId, Decision, GradedTicket, Stamp } from "./types";

const LEARNING_SAMPLE = 5;
const VETO_AT = -3;
const ALLOW_AT = 2;

export function decide(
  tickets: GradedTicket[],
  cell: CellId,
  memoryOff = false,
): Decision {
  if (memoryOff) {
    return {
      stamp: "LEARNING",
      samples: 0,
      meanClv: 0,
      citedIds: [],
      clause: "Cold start. The record is hidden, not deleted.",
    };
  }

  const mine = tickets.filter((ticket) => ticket.cell === cell);
  const samples = mine.length;
  const meanClv = samples === 0 ? 0 : roundPp(mine.reduce((sum, ticket) => sum + ticket.clvPp, 0) / samples);
  const citedIds = mine.map((ticket) => ticket.id);

  if (samples < LEARNING_SAMPLE) {
    return {
      stamp: "LEARNING",
      samples,
      meanClv,
      citedIds,
      clause: `${samples} graded tickets in ${cell}. The log stays open until ${LEARNING_SAMPLE}.`,
    };
  }

  const stamp: Stamp = meanClv <= VETO_AT ? "VETO" : meanClv >= ALLOW_AT ? "ALLOW" : "FLAT";
  const verb = stamp === "VETO" ? "Block" : stamp === "ALLOW" ? "Allow" : "Leave open";
  return {
    stamp,
    samples,
    meanClv,
    citedIds,
    clause: `${verb} ${cell}. ${samples} graded tickets, mean closing-line value ${formatClv(meanClv)} percentage points.`,
  };
}

export function formatClv(value: number): string {
  const rounded = roundPp(value);
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

export function canLog(stamp: Stamp, bookOnline: boolean): boolean {
  return bookOnline && stamp !== "VETO";
}
