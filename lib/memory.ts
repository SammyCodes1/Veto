import { MemWal } from "@mysten-incubation/memwal";

let client: MemWal | null = null;

export function memoryConfigured(): boolean {
  return Boolean(process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID);
}

function memwal(): MemWal | null {
  if (!memoryConfigured()) return null;
  if (!client) {
    client = MemWal.create({
      key: process.env.MEMWAL_PRIVATE_KEY ?? "",
      accountId: process.env.MEMWAL_ACCOUNT_ID ?? "",
      serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz",
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
