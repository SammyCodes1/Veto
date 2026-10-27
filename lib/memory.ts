import { MemWal } from "@mysten-incubation/memwal";

let client: MemWal | null = null;

export function memoryConfigured(): boolean {
  return Boolean(envValue("MEMWAL_PRIVATE_KEY") && envValue("MEMWAL_ACCOUNT_ID"));
}

function envValue(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function memwal(): MemWal | null {
  const key = envValue("MEMWAL_PRIVATE_KEY");
  const accountId = envValue("MEMWAL_ACCOUNT_ID");
  if (!key || !accountId) return null;
  if (!client) {
    client = MemWal.create({
      key,
      accountId,
      serverUrl: envValue("MEMWAL_SERVER_URL") || "https://relayer.memory.walrus.xyz",
      namespace: "veto.tickets",
    });
  }
  return client;
}

export async function remember(text: string, namespace: string): Promise<string | null> {
  const client = memwal();
  if (!client) return null;
  const existing = await client.recall({ query: text.slice(0, 180), namespace, limit: 3 });
  const prior = existing.results?.find((row) => row.text === text);
  if (prior?.blob_id) return prior.blob_id;
  const saved = await client.rememberAndWait(text, namespace);
  return saved.blob_id ?? null;
}

export async function recallTexts(query: string, namespace: string): Promise<string[]> {
  const client = memwal();
  if (!client) return [];
  const result = await client.recall({ query, namespace, limit: 4 });
  return (result.results ?? []).map((row) => row.text).filter((text): text is string => Boolean(text));
}
