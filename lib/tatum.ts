const PREDICTION = "https://api.tatum.io/v4/data/prediction";

type CacheEntry = { at: number; body: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function key(): string {
  const value = process.env.TATUM_API_KEY;
  if (!value) throw new Error("TATUM_API_KEY is not set");
  return value;
}

export function tatumConfigured(): boolean {
  return Boolean(process.env.TATUM_API_KEY);
}

async function tatumGet(path: string): Promise<unknown> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body;
  const response = await fetch(`${PREDICTION}${path}`, {
    headers: { "x-api-key": key(), accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Tatum ${path} returned ${response.status}`);
  }
  const body = await response.json();
  cache.set(path, { at: Date.now(), body });
  return body;
}

export type ChainQuote = {
  yes: number | null;
  no: number | null;
  timestamp: string | null;
};

export async function chainPrice(marketId: string): Promise<ChainQuote> {
  const body = (await tatumGet(`/markets/${encodeURIComponent(marketId)}/price`)) as {
    data?: { yes?: { price?: number }; no?: { price?: number }; timestamp?: string };
  };
  return {
    yes: numberOrNull(body.data?.yes?.price),
    no: numberOrNull(body.data?.no?.price),
    timestamp: body.data?.timestamp ?? null,
  };
}

export type Candle = { t: number; p: number };

export async function chainHistory(marketId: string): Promise<Candle[]> {
  const end = new Date();
  end.setMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    interval: "1h",
    start: start.toISOString(),
    end: end.toISOString(),
  });
  const body = await tatumGet(`/markets/${encodeURIComponent(marketId)}/history?${params.toString()}`);
  return parseCandles(body);
}

export type MarketFacts = {
  closeTime: string | null;
  status: string;
  yesWins: boolean | null;
};

export async function marketFacts(marketId: string): Promise<MarketFacts> {
  const body = (await tatumGet(`/markets/${encodeURIComponent(marketId)}`)) as { data?: Record<string, unknown> };
  const data = body.data ?? {};
  return {
    closeTime: stringOrNull(data.endDate ?? data.closeTime ?? data.endTime ?? data.expirationTime),
    status: String(data.status ?? ""),
    yesWins: readWinner(data),
  };
}

const SUI_GRAPHQL_URL = "https://sui-mainnet.gateway.tatum.io/graphql";

type GqlEvent = { contents?: { type?: { repr?: string }; json?: Record<string, unknown> } };
type GqlObject = { address?: string; contents?: { json?: Record<string, unknown> } };
type GqlTx = {
  transaction?: {
    sender?: { address?: string };
    effects?: {
      timestamp?: string | null;
      events?: { nodes?: GqlEvent[] };
      objectChanges?: { nodes?: Array<{ address?: string; idCreated?: boolean }> };
    };
  } | null;
};

export async function suiRpc<T>(method: string, params: unknown[]): Promise<T> {
  if (method === "sui_getTransactionBlock") return readTransaction(String(params[0])) as Promise<T>;
  if (method === "sui_getObject") return readObject(String(params[0])) as Promise<T>;
  if (method === "suix_getOwnedObjects") {
    const owner = String(params[0]);
    const filter = params[1] as { filter?: { StructType?: string } };
    return readOwned(owner, filter.filter?.StructType ?? "", (params[2] as string | null) ?? null) as Promise<T>;
  }
  throw new Error(`Tatum Sui GraphQL does not implement ${method}`);
}

async function suiGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(SUI_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-api-key": key(),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Tatum Sui GraphQL returned ${response.status}`);
  const body = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };
  if (body.errors?.length) throw new Error(body.errors[0]?.message || "Tatum Sui GraphQL failed");
  return body.data as T;
}

async function readTransaction(digest: string) {
  const data = await suiGraphql<GqlTx>(`query ($digest: String!) {
    transaction(digest: $digest) {
      sender { address }
      effects {
        timestamp
        events { nodes { contents { type { repr } json } } }
        objectChanges { nodes { address idCreated } }
      }
    }
  }`, { digest });
  const tx = data.transaction;
  const effects = tx?.effects;
  const timestamp = effects?.timestamp ? Date.parse(effects.timestamp) : 0;
  return {
    timestampMs: String(Number.isFinite(timestamp) ? timestamp : 0),
    transaction: { data: { sender: tx?.sender?.address ?? "" } },
    events: (effects?.events?.nodes ?? []).map((event) => ({
      type: event.contents?.type?.repr ?? "",
      parsedJson: event.contents?.json ?? {},
    })),
    objectChanges: (effects?.objectChanges?.nodes ?? []).map((change) => ({
      type: change.idCreated ? "created" : "mutated",
      objectId: change.address ?? "",
      objectType: "",
    })),
  };
}

async function readObject(objectId: string) {
  const data = await suiGraphql<{ object?: { asMoveObject?: { contents?: { json?: Record<string, unknown> } } } | null }>(`query ($address: SuiAddress!) {
    object(address: $address) { asMoveObject { contents { json } } }
  }`, { address: objectId });
  return { data: { content: { fields: data.object?.asMoveObject?.contents?.json } } };
}

async function readOwned(owner: string, structType: string, cursor: string | null) {
  const data = await suiGraphql<{
    address?: {
      objects?: {
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
        nodes?: GqlObject[];
      };
    };
  }>(`query ($owner: SuiAddress!, $type: String!, $after: String) {
    address(address: $owner) {
      objects(first: 50, after: $after, filter: { type: $type }) {
        pageInfo { hasNextPage endCursor }
        nodes { address contents { json } }
      }
    }
  }`, { owner, type: structType, after: cursor });
  const page = data.address?.objects;
  return {
    hasNextPage: page?.pageInfo?.hasNextPage ?? false,
    nextCursor: page?.pageInfo?.endCursor ?? null,
    data: (page?.nodes ?? []).map((node) => ({
      data: { objectId: node.address, content: { fields: node.contents?.json } },
    })),
  };
}

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readWinner(data: Record<string, unknown>): boolean | null {
  const resolution = data.resolution;
  const resolutionName = resolution && typeof resolution === "object"
    ? String((resolution as Record<string, unknown>).outcome ?? "")
    : "";
  const status = String(data.status ?? "").toLowerCase();
  const settled = status.includes("resolved") || status.includes("settled") || data.resolved === true || resolutionName.length > 0;
  if (!settled) return null;
  const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
  const names = outcomes.map((outcome) => {
    if (!outcome || typeof outcome !== "object") return "";
    const row = outcome as Record<string, unknown>;
    return String(row.name ?? row.outcome ?? row.title ?? "");
  });
  const winner = (resolutionName || String(data.winningOutcome ?? data.result ?? data.resolvedOutcome ?? "")).toLowerCase();
  if (winner === "yes" || winner === "over") return true;
  if (winner === "no" || winner === "under") return false;
  const named = names.findIndex((name) => name.toLowerCase() === winner);
  if (named === 0) return true;
  if (named === 1) return false;
  const marked = outcomes.find((outcome) => {
    if (!outcome || typeof outcome !== "object") return false;
    const row = outcome as Record<string, unknown>;
    return row.winner === true || row.resolved === true;
  }) as Record<string, unknown> | undefined;
  if (!marked) return null;
  const name = String(marked.name ?? marked.outcome ?? marked.title ?? "").toLowerCase();
  if (name === "yes" || name === "over") return true;
  if (name === "no" || name === "under") return false;
  return marked.index === 0 ? true : marked.index === 1 ? false : null;
}

function parseCandles(body: unknown): Candle[] {
  const root = (body ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;
  const rows = [data.candles, data.history, data.prices, root.candles, Array.isArray(root.data) ? root.data : null]
    .find(Array.isArray) as unknown[] | undefined;
  if (!rows) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const t = Date.parse(String(item.timestamp ?? item.t ?? item.time ?? item.startTime ?? ""));
      const yes = item.yes as Record<string, unknown> | undefined;
      const p = Number(item.close ?? item.c ?? item.price ?? yes?.price ?? item.mid);
      if (!Number.isFinite(p)) return null;
      return { t: Number.isFinite(t) ? t : 0, p };
    })
    .filter((row): row is Candle => row !== null);
}
