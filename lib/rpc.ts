import { fromBps, gradesAgree } from "./clv";
import { suiRpc } from "./tatum";
import type { CellId } from "./types";
import { isCellId } from "./types";

export type PlacedPick = {
  digest: string;
  pickId: string;
  marketId: string;
  sender: string;
  placedMs: number;
  timestampMs: number;
  cell: CellId;
  side: number;
  bookBps: number;
  chainBps: number;
  declaredSize: number;
};

export type OwnedPick = PlacedPick & {
  closeBps: number;
  outcome: number;
  gradedMs: number;
};

type OwnedPage = {
  data?: Array<{ data?: { objectId?: string; content?: { fields?: Record<string, unknown> } } }>;
  nextCursor?: string | null;
  hasNextPage?: boolean;
};

type TxBlock = {
  timestampMs?: string;
  transaction?: { data?: { sender?: string } };
  events?: Array<{ type?: string; parsedJson?: Record<string, unknown> }>;
  objectChanges?: Array<{ type?: string; objectType?: string; objectId?: string }>;
};

export async function readPlacement(digest: string, packageId: string): Promise<PlacedPick | null> {
  const tx = await suiRpc<TxBlock>("sui_getTransactionBlock", [
    digest,
    { showInput: true, showEffects: true, showEvents: true, showObjectChanges: true },
  ]);
  const event = tx.events?.find((item) => item.type === `${packageId}::pick::PickPlaced`);
  if (!event?.parsedJson) return null;
  const json = event.parsedJson;
  const marketId = String(json.market_id ?? json.marketId ?? "");
  const sender = String(json.bettor ?? tx.transaction?.data?.sender ?? "");
  const placedMs = Number(json.placed_ms ?? json.placedMs ?? 0);
  const timestampMs = Number(tx.timestampMs ?? 0);
  const created = tx.objectChanges?.find(
    (change) => change.type === "created" && change.objectType?.startsWith(`${packageId}::pick::Pick`),
  );
  const pickId = String(json.pick_id ?? json.pickId ?? created?.objectId ?? "");
  if (!marketId || !sender || !pickId) return null;

  const object = await suiRpc<{ data?: { content?: { fields?: Record<string, unknown> } } }>("sui_getObject", [
    pickId,
    { showContent: true },
  ]);
  const owned = parseOwned(pickId, object.data?.content?.fields);
  if (!owned) return null;
  return { ...owned, digest, sender, timestampMs: timestampMs || placedMs, placedMs };
}

export async function readOwnedPicks(address: string, packageId: string): Promise<OwnedPick[]> {
  if (!packageId || !address) return [];
  const picks: OwnedPick[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const result: OwnedPage = await suiRpc<OwnedPage>("suix_getOwnedObjects", [
      address,
      {
        filter: { StructType: `${packageId}::pick::Pick` },
        options: { showContent: true },
      },
      cursor,
      50,
    ]);
    for (const row of result.data ?? []) {
      const parsed = parseOwned(row.data?.objectId ?? "", row.data?.content?.fields);
      if (parsed) picks.push({ ...parsed, digest: "", timestampMs: parsed.placedMs });
    }
    if (!result.hasNextPage || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return picks;
}

function parseOwned(objectId: string, fields: Record<string, unknown> | undefined): OwnedPick | null {
  if (!fields) return null;
  const cell = String(fields.cell ?? "");
  if (!isCellId(cell)) return null;
  return {
    digest: "",
    pickId: objectId,
    marketId: String(fields.market_id ?? ""),
    sender: String(fields.bettor ?? ""),
    placedMs: Number(fields.placed_ms ?? 0),
    timestampMs: Number(fields.placed_ms ?? 0),
    cell: cell as CellId,
    side: Number(fields.side ?? 0),
    bookBps: Number(fields.book_bps ?? 0),
    chainBps: Number(fields.chain_bps ?? 0),
    declaredSize: Number(fields.declared_size ?? 0),
    closeBps: Number(fields.close_bps ?? 0),
    outcome: Number(fields.outcome ?? 0),
    gradedMs: Number(fields.graded_ms ?? 0),
  };
}

export function liveClv(pick: OwnedPick): number | null {
  if (pick.outcome === 0 || pick.closeBps === 0) return null;
  const entryYes = fromBps(pick.chainBps);
  const closeYes = fromBps(pick.closeBps);
  const entry = pick.side === 1 ? entryYes : 1 - entryYes;
  const close = pick.side === 1 ? closeYes : 1 - closeYes;
  return (close - entry) * 100;
}

/** close_bps is always the YES price. It must sit within 1 point of Tatum. */
export function gradeMatchesTatum(pick: OwnedPick, yesProb: number): boolean {
  return gradesAgree(pick.closeBps, yesProb);
}
