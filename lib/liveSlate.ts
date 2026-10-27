import fallback from "../data/slate.json";
import { decide } from "./decision";
import { gradedFromSeed } from "./ledger";
import type { CellId, SlateRow } from "./types";
import { CELLS } from "./types";

type GammaMarket = { question?: string; conditionId?: string; outcomes?: string; endDate?: string };
type GammaEvent = { title?: string; endDate?: string; markets?: GammaMarket[] };
type OddsOutcome = { name?: string; price?: number; point?: number };
type OddsEvent = {
  home_team?: string;
  away_team?: string;
  bookmakers?: Array<{ key?: string; markets?: Array<{ key?: string; outcomes?: OddsOutcome[] }> }>;
};

const HOLD_MS = 20 * 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;

let cache: { at: number; rows: SlateRow[] } | null = null;
let inflight: Promise<SlateRow[]> | null = null;

export async function currentSlate(): Promise<SlateRow[]> {
  if (cache && Date.now() - cache.at < REFRESH_MS) return cache.rows;
  if (!inflight) inflight = refresh().finally(() => { inflight = null; });
  return inflight;
}

export function stillOpen(rows: SlateRow[]): SlateRow[] {
  const now = Date.now();
  return rows.filter((row) => Date.parse(row.closeTime) > now);
}

async function refresh(): Promise<SlateRow[]> {
  try {
    const rows = await loadMatchedSlate();
    if (rows.length === 0) throw new Error("The live slate was empty.");
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    if (cache) return cache.rows;
    return fallback as SlateRow[];
  }
}

export async function loadMatchedSlate(): Promise<SlateRow[]> {
  const key = process.env.ODDS_API_KEY;
  if (!key) return fallback as SlateRow[];
  const [nbaBooks, nflBooks, nbaGames, nflGames] = await Promise.all([
    sportOdds("basketball_nba", key),
    sportOdds("americanfootball_nfl", key),
    gammaEvents("10345"),
    gammaEvents("12185"),
  ]);
  const rows = [
    ...matched(nbaBooks, nbaGames, "nba"),
    ...matched(nflBooks, nflGames, "nfl"),
  ];
  const slate = CELLS.flatMap((cell) => take(rows, cell, limitFor(cell)));
  if (!slate.some((row) => row.cell === "nfl:moneyline")) return fallback as SlateRow[];
  return slate;
}

function limitFor(cell: CellId): number {
  return decide(gradedFromSeed(false), cell).stamp === "VETO" ? 2 : 12;
}

function take(rows: SlateRow[], cell: CellId, limit: number): SlateRow[] {
  return rows.filter((row) => row.cell === cell).slice(0, limit);
}

function matched(books: OddsEvent[], games: GammaEvent[], sport: "nba" | "nfl"): SlateRow[] {
  const now = Date.now();
  const rows: SlateRow[] = [];
  for (const book of books) {
    const game = games.find((item) => titlesMatch(item.title, book));
    if (!game?.title) continue;
    const moneyline = (game.markets ?? []).find((market) => market.question === game.title);
    pushRow(rows, sport, "moneyline", game, moneyline, now);
    const line = bookLine(book);
    const total = line === null ? undefined : (game.markets ?? []).find((market) => market.question === `${game.title}: O/U ${line}`);
    pushRow(rows, sport, "total", game, total, now);
  }
  return rows.sort((a, b) => Date.parse(a.closeTime) - Date.parse(b.closeTime));
}

function pushRow(
  rows: SlateRow[],
  sport: "nba" | "nfl",
  kind: "moneyline" | "total",
  game: GammaEvent,
  market: GammaMarket | undefined,
  now: number,
) {
  const closeTime = market?.endDate || game.endDate;
  if (!market?.conditionId || !closeTime || Date.parse(closeTime) <= now + HOLD_MS) return;
  const labels = parseList(market.outcomes ?? "[]");
  const [away, home] = (game.title ?? "").split(" vs. ").map((part) => part.trim());
  rows.push({
    id: market.conditionId,
    cell: `${sport}:${kind}`,
    title: market.question || game.title || "",
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

function bookLine(event: OddsEvent): number | null {
  const books = [...(event.bookmakers ?? [])].sort((a, b) => (a.key === "draftkings" ? -1 : b.key === "draftkings" ? 1 : 0));
  for (const book of books) {
    const point = book.markets?.find((market) => market.key === "totals")?.outcomes?.find((outcome) => outcome.point !== undefined)?.point;
    if (typeof point === "number") return point;
  }
  return null;
}

function titlesMatch(title: string | undefined, book: OddsEvent): boolean {
  if (!title || !/^[^:]+\svs\.\s[^:]+$/.test(title)) return false;
  const [away, home] = title.split(" vs. ");
  return Boolean(away && home && book.away_team && book.home_team && sameTeam(away, book.away_team) && sameTeam(home, book.home_team));
}

function sameTeam(left: string, right: string): boolean {
  const a = left.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(" ").at(-1) ?? "";
  const b = right.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(" ").at(-1) ?? "";
  return a.length > 2 && a === b;
}

async function sportOdds(sport: string, key: string): Promise<OddsEvent[]> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,totals");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("apiKey", key);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Odds API returned ${response.status}`);
  return (await response.json()) as OddsEvent[];
}

async function gammaEvents(series: string): Promise<GammaEvent[]> {
  const events: GammaEvent[] = [];
  for (let offset = 0; offset < 240; offset += 40) {
    const response = await fetch(`https://gamma-api.polymarket.com/events?series_id=${series}&closed=false&active=true&limit=40&offset=${offset}&order=endDate&ascending=true`);
    if (!response.ok) break;
    const page = (await response.json()) as GammaEvent[];
    if (!Array.isArray(page) || page.length === 0) break;
    events.push(...page);
  }
  return events;
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
