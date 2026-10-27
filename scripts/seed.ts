import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { MemWal } from "@mysten-incubation/memwal";
import { decide } from "../lib/decision";
import { cellRuleMemory, ticketMemory } from "../lib/memoryText";
import type { CellId, SeedTicket } from "../lib/types";
import { CELLS } from "../lib/types";

type Written = Record<string, string>;

async function main() {
  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) {
    throw new Error("Set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID before writing Mainnet memories.");
  }
  const tickets = (JSON.parse(readFileSync("data/seed-tickets.json", "utf8")) as { tickets: SeedTicket[] }).tickets;
  if (tickets.length < 10) {
    throw new Error("Seed has fewer than 10 tickets. Run pnpm build-seed first.");
  }
  const writtenPath = "data/seed-written.json";
  const written: Written = existsSync(writtenPath) ? JSON.parse(readFileSync(writtenPath, "utf8")) : {};
  const memwal = MemWal.create({
    key,
    accountId,
    serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz",
    namespace: "veto.tickets",
  });

  const pending = tickets.filter((ticket) => !written[ticket.id]);
  const batchSize = 4;
  for (let index = 0; index < pending.length; index += batchSize) {
    const slice = pending.slice(index, index + batchSize);
    const saved = await memwal.rememberBulkAndWait(slice.map((ticket) => ({
      text: ticketMemory(ticket),
      namespace: "veto.tickets",
    })));
    saved.results.forEach((row, offset) => {
      if (row.status !== "done" || !row.blob_id) {
        throw new Error(row.error || `Seed ticket ${slice[offset].id} was not stored`);
      }
      written[slice[offset].id] = row.blob_id;
    });
    writeFileSync(writtenPath, JSON.stringify(written, null, 2));
    console.log(`wrote ${Math.min(index + batchSize, pending.length)} / ${pending.length}`);
    if (index + batchSize < pending.length) {
      await new Promise((resolve) => setTimeout(resolve, 65_000));
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 65_000));
  for (const cell of CELLS) {
    const decision = decide(
      tickets.filter((ticket) => ticket.cell === cell).map((ticket) => ({
        id: ticket.id,
        cell: ticket.cell as CellId,
        clvPp: ticket.clvPp,
        won: ticket.result === "won",
      })),
      cell,
    );
    const ruleId = `rule:${cell}:${decision.stamp}:${decision.samples}`;
    if (written[ruleId]) continue;
    const saved = await memwal.rememberAndWait(cellRuleMemory(cell, decision), "veto.cells");
    written[ruleId] = saved.blob_id ?? "written";
    writeFileSync(writtenPath, JSON.stringify(written, null, 2));
    console.log(ruleId, written[ruleId]);
  }
  console.log(`memories tracked: ${Object.keys(written).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
