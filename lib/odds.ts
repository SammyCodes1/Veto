import type { SlateRow } from "./types";

type OddsOutcome = { name?: string; price?: number; point?: number };
type OddsMarket = { key?: string; outcomes?: OddsOutcome[] };
type OddsBook = { key?: string; title?: string; markets?: OddsMarket[] };
type OddsEvent = { home_team?: string; away_team?: string; bookmakers?: OddsBook[] };

const cache = new Map<string, { at: number; events: OddsEvent[] }>();

export function oddsConfigured(): boolean {
  return Boolean(process.env.ODDS_API_KEY);
}

export async function bookProbability(row: SlateRow): Promise<number | null> {
  if (!oddsConfigured()) return null;
  const events = await sportOdds(row.odds.sportKey);
  const event = events.find((item) => namesMatch(item, row));
  if (!event) return null;
  const book = event.bookmakers?.find((item) => item.key === "draftkings") ?? event.bookmakers?.[0];
  const market = book?.markets?.find((item) => item.key === row.odds.market);
  if (!market?.outcomes || market.outcomes.length < 2) return null;
  const outcomes = row.odds.market === "totals" ? outcomesAtLine(market.outcomes, row.title) : market.outcomes;
  if (outcomes.length < 2) return null;
  const wanted = outcomes.find((outcome) => sameName(outcome.name, row.odds.outcome));
  if (!wanted?.price || wanted.price <= 1) return null;
  const total = outcomes.reduce((sum, outcome) => sum + (outcome.price && outcome.price > 1 ? 1 / outcome.price : 0), 0);
  if (total <= 0) return null;
  return (1 / wanted.price) / total;
}

async function sportOdds(sportKey: string): Promise<OddsEvent[]> {
  const hit = cache.get(sportKey);
  if (hit && Date.now() - hit.at < 60_000) return hit.events;
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,totals");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("apiKey", process.env.ODDS_API_KEY || "");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Odds API returned ${response.status}`);
  const events = (await response.json()) as OddsEvent[];
  cache.set(sportKey, { at: Date.now(), events });
  return events;
}

function outcomesAtLine(outcomes: OddsOutcome[], title: string): OddsOutcome[] {
  const match = title.match(/O\/U\s+(\d+(?:\.\d+)?)/);
  const line = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(line)) return [];
  return outcomes.filter((outcome) => outcome.point === line);
}

function namesMatch(event: OddsEvent, row: SlateRow): boolean {
  const home = event.home_team ?? "";
  const away = event.away_team ?? "";
  return sameName(home, row.odds.home) && sameName(away, row.odds.away);
}

function sameName(left: string | undefined, right: string): boolean {
  if (!left) return false;
  const a = left.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const b = right.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const aLast = a.split(" ").at(-1);
  const bLast = b.split(" ").at(-1);
  return aLast === b || bLast === a || (aLast !== undefined && aLast === bLast && aLast.length > 2);
}
