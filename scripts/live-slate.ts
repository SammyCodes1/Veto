import { writeFileSync } from "node:fs";
import { loadMatchedSlate } from "../lib/liveSlate";

async function main() {
  const slate = await loadMatchedSlate();
  writeFileSync("data/slate.json", JSON.stringify(slate, null, 2));
  for (const row of slate) console.log(row.cell, row.title, row.closeTime);
  console.log(`slate rows: ${slate.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
