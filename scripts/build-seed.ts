import { writeFileSync } from "node:fs";
import { clvPp, roundPp, toBps } from "../lib/clv";
import type { CellId, SeedTicket, SlateRow } from "../lib/types";

const SERIES = {
  nba: "10345",
  nfl: "12185",
} as const;

type GammaMarket = {
  question?: string;
  conditionId?: string;
  endDate?: string;
  outcomes?: string;
  clobTokenIds?: string;
};

type GammaEvent = {
  title?: string;
  endDate?: string;
  markets?: GammaMarket[];
};

type Point = { t: number; p: number };

const targets: Record<CellId, { sport: "nba" | "nfl"; kind: "moneyline" | "total"; count: number; band: "neg" | "pos" | "any" }> = {
  "nfl:moneyline": { sport: "nfl", kind: "moneyline", count: 8, band: "neg" },
  "nba:total": { sport: "nba", kind: "total", count: 8, band: "pos" },
  "nba:moneyline": { sport: "nba", kind: "moneyline", count: 3, band: "any" },
  "nfl:total": { sport: "nfl", kind: "total", count: 3, band: "any" },
};

async function main() {
  const closed = {
    nba: await events(SERIES.nba, true),
    nfl: await events(SERIES.nfl, true),
  };
  const tickets: SeedTicket[] = [];
  for (const [cell, target] of Object.entries(targets) as Array<[CellId, (typeof targets)[CellId]]>) {
    const found = await fillCell(cell, target, closed[target.sport]);
    tickets.push(...found);
    console.log(`${cell}: ${found.length}/${target.count}`);
  }

  const openEvents = {
    nba: await events(SERIES.nba, false),
    nfl: await events(SERIES.nfl, false),
  };
  const slate = [
    ...pickSlate(slateFrom(openEvents.nba, "nba")),
    ...pickSlate(slateFrom(openEvents.nfl, "nfl")),
  ];

  assertSeed(tickets);
  if (!slate.some((row) => row.cell === "nfl:moneyline") || !slate.some((row) => row.cell === "nba:total")) {
    throw new Error("Slate is missing an open NFL moneyline or NBA total.");
  }
  writeFileSync("data/seed-tickets.json", JSON.stringify({ tickets, generatedAt: new Date().toISOString(), priceSource: "polymarket-clob" }, null, 2));
  console.log(`seed slate candidates: ${slate.length}. The live board is data/slate.json from scripts/live-slate.ts.`);
}

function assertSeed(tickets: SeedTicket[]) {
  for (const [cell, target] of Object.entries(targets) as Array<[CellId, (typeof targets)[CellId]]>) {
    const rows = tickets.filter((ticket) => ticket.cell === cell);
    if (rows.length < target.count) throw new Error(`${cell} has ${rows.length}, wanted ${target.count}`);
    if (target.band === "any" && rows.length >= 5) throw new Error(`${cell} is no longer a learning cell`);
    const mean = rows.reduce((sum, ticket) => sum + ticket.clvPp, 0) / rows.length;
    if (target.band === "neg" && mean > -4) throw new Error(`${cell} mean ${mean.toFixed(2)} is not at or below -4`);
    if (target.band === "pos" && mean < 3) throw new Error(`${cell} mean ${mean.toFixed(2)} is not at or above +3`);
    console.log(`${cell} mean ${mean.toFixed(2)}`);
  }
}

async function events(series: string, closed: boolean): Promise<GammaEvent[]> {
  const all: GammaEvent[] = [];
  for (let offset = 0; offset < 150; offset += 30) {
    const url = `https://gamma-api.polymarket.com/events?series_id=${series}&closed=${closed}&active=${!closed}&limit=30&offset=${offset}&order=endDate&ascending=${closed ? "false" : "true"}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gamma ${response.status}`);
    const page = (await response.json()) as GammaEvent[];
    if (page.length === 0) break;
    all.push(...page);
  }
  return all;
}

async function fillCell(
  cell: CellId,
  target: (typeof targets)[CellId],
  games: GammaEvent[],
): Promise<SeedTicket[]> {
  const tickets: SeedTicket[] = [];
  for (const game of games) {
    if (tickets.length >= target.count) break;
    if (!game.title || !/^[^:]+\svs\.\s[^:]+$/.test(game.title)) continue;
    const market = pickMarket(game, target.kind);
    if (!market?.conditionId || !market.clobTokenIds) continue;
    const token = parseList(market.clobTokenIds)[0];
    const labels = parseList(market.outcomes ?? "[]");
    if (!token) continue;
    const history = await prices(token);
    if (history.length < 4) continue;
    const room = target.count - tickets.length;
    const chosen = chooseMany(history, target.band, Math.min(3, room));
    const conditionId = market.conditionId;
    if (!conditionId) continue;
    const yes = labels[0] || "Yes";
    if (chosen.length > 0) console.log(`  ${game.title}: +${chosen.length}`);
    chosen.forEach((pick, index) => {
      const titleBase = market.question || game.title || cell;
      tickets.push({
        id: `${cell}-${conditionId.slice(2, 10)}-${pick.entry.t}`,
        origin: "seed",
        cell,
        marketId: conditionId,
        title: index === 0 ? titleBase : `${titleBase} · ${new Date(pick.entry.t * 1000).toISOString().slice(0, 13)}`,
        side: "YES",
        yesLabel: yes,
        bookBps: null,
        bookSource: "unavailable",
        chainBps: toBps(pick.entry.p),
        closeBps: toBps(pick.close.p),
        clvPp: roundPp(pick.clv),
        result: pick.close.p >= 0.5 ? "won" : "lost",
        entryAt: new Date(pick.entry.t * 1000).toISOString(),
        closeAt: new Date(pick.close.t * 1000).toISOString(),
        priceSource: "polymarket-clob",
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return tickets;
}

function pickMarket(game: GammaEvent, kind: "moneyline" | "total"): GammaMarket | undefined {
  const markets = game.markets ?? [];
  if (kind === "moneyline") return markets.find((market) => market.question === game.title);
  return markets.find((market) => saneTotal(market.question ?? ""));
}

function saneTotal(question: string): boolean {
  if (!question.includes(" vs. ") || question.includes("1H") || !/: O\/U \d/.test(question)) return false;
  const line = Number(question.match(/O\/U\s+(\d+(?:\.\d+)?)/)?.[1] ?? "");
  const nfl = line >= 35 && line <= 70;
  const nba = line >= 190 && line <= 280;
  return nfl || nba;
}

function chooseMany(points: Point[], band: "neg" | "pos" | "any", max: number) {
  if (points.length < 4 || max <= 0) return [];
  const close = points[points.length - 1];
  // A real close on a resolved binary market sits near 0 or 1. Mid prints are not resolutions.
  if (close.p > 0.05 && close.p < 0.95) return [];
  const hits: { entry: Point; close: Point; clv: number }[] = [];
  const ordered = band === "neg"
    ? [...points].sort((a, b) => b.p - a.p)
    : [...points].sort((a, b) => a.p - b.p);
  for (const entry of ordered) {
    if (close.t - entry.t < 60 * 60) continue;
    if (entry.p <= 0.02 || entry.p >= 0.98) continue;
    const clv = clvPp(entry.p, close.p);
    const ok = band === "any"
      ? Math.abs(clv) >= 1 && Math.abs(clv) <= 40
      : band === "neg"
        ? clv <= -4
        : clv >= 3;
    if (!ok) continue;
    if (hits.some((hit) => Math.abs(hit.entry.t - entry.t) < 6 * 60 * 60)) continue;
    hits.push({ entry, close, clv });
    if (hits.length >= max) break;
  }
  return hits;
}

async function prices(token: string): Promise<Point[]> {
  const url = `https://clob.polymarket.com/prices-history?market=${token}&interval=max&fidelity=60`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const body = (await response.json()) as { history?: Point[] };
  return (body.history ?? []).filter((point) => Number.isFinite(point.p) && Number.isFinite(point.t));
}

function pickSlate(rows: SlateRow[]): SlateRow[] {
  return (["moneyline", "total"] as const).flatMap((kind) => rows.filter((row) => row.cell.endsWith(kind)).slice(0, 2));
}

function slateFrom(games: GammaEvent[], sport: "nba" | "nfl"): SlateRow[] {
  const rows: SlateRow[] = [];
  const now = Date.now();
  for (const game of games) {
    if (!game.title || !/^[^:]+\svs\.\s[^:]+$/.test(game.title)) continue;
    const [away, home] = game.title.split(" vs. ").map((part) => part.trim());
    if (!away || !home) continue;
    for (const kind of ["moneyline", "total"] as const) {
      const market = pickMarket(game, kind);
      const closeTime = market?.endDate || game.endDate;
      if (!market?.conditionId || !closeTime || Date.parse(closeTime) <= now + 6 * 60 * 60 * 1000) continue;
      const labels = parseList(market.outcomes ?? "[]");
      const cell = `${sport}:${kind}` as CellId;
      rows.push({
        id: market.conditionId,
        cell,
        title: market.question || game.title,
        polymarketId: market.conditionId,
        yesLabel: labels[0] || "Yes",
        noLabel: labels[1] || "No",
        closeTime: new Date(closeTime).toISOString(),
        odds: {
          sportKey: sport === "nba" ? "basketball_nba" : "americanfootball_nfl",
          home,
          away,
          market: kind === "moneyline" ? "h2h" : "totals",
          outcome: labels[0] || "Yes",
        },
      });
    }
  }
  return rows;
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
