export const CELLS = [
  "nba:moneyline",
  "nba:total",
  "nfl:moneyline",
  "nfl:total",
] as const;

export type CellId = (typeof CELLS)[number];

export type Stamp = "VETO" | "ALLOW" | "FLAT" | "LEARNING";

export type GradedTicket = {
  id: string;
  cell: CellId;
  clvPp: number;
  won: boolean;
};

export type Decision = {
  stamp: Stamp;
  samples: number;
  meanClv: number;
  citedIds: string[];
  clause: string;
};

export type SeedTicket = {
  id: string;
  origin: "seed";
  cell: CellId;
  marketId: string;
  title: string;
  side: "YES" | "NO";
  yesLabel: string;
  bookBps: number | null;
  bookSource: "unavailable";
  chainBps: number;
  closeBps: number;
  clvPp: number;
  result: "won" | "lost";
  entryAt: string;
  closeAt: string;
  priceSource: "polymarket-clob" | "tatum";
};

export type SlateRow = {
  id: string;
  cell: CellId;
  title: string;
  polymarketId: string;
  yesLabel: string;
  noLabel: string;
  kalshiTicker?: string;
  closeTime: string;
  odds: {
    sportKey: "basketball_nba" | "americanfootball_nfl";
    home: string;
    away: string;
    market: "h2h" | "totals";
    outcome: string;
  };
};

export function isCellId(value: string): value is CellId {
  return (CELLS as readonly string[]).includes(value);
}
