# Veto

A pick logger for the Tatum × Walrus Total Recall hackathon, Markets & Sports Prediction track.

Veto compares a bookmaker price with the Polymarket price. It stores what you logged in Walrus Memory on Mainnet. When your closing-line record in a cell is bad, the log button dies.

## Rules this build follows

- Walrus Memory writes go to Mainnet (`https://relayer.memory.walrus.xyz`).
- A live pick counts only after Tatum Sui RPC reads the transaction back, before the market close.
- Chain prices come from Tatum's prediction API. The book comes from The Odds API.
- The seed is real Polymarket prints, labeled `seed` on the record page and in `/letter`. It is not a backdated Sui transaction.
- One submission. The letter at `/letter` is the blog post.

## Setup

Copy `.env.example` to `.env` and fill in:

1. A Tatum API key and the dashboard account id for the submission form.
2. A delegate key from https://memory.walrus.xyz (Mainnet). `MEMWAL_AGENT_ID` is the delegate public key.
3. An Odds API key.
4. After `sui client publish` of `packages/veto` on mainnet, both package id variables.

Then, from this directory:

```powershell
pnpm install
pnpm test
pnpm build-seed
pnpm seed
pnpm dev
```

If `pnpm` walks up into a parent workspace and fails, call the local binaries instead. Do not run `pnpm` from the parent folder.

```powershell
node .\node_modules\tsx\dist\cli.mjs --test lib\decision.test.ts
node .\node_modules\tsx\dist\cli.mjs scripts\build-seed.ts
node .\node_modules\tsx\dist\cli.mjs --env-file=.env scripts\seed.ts
node .\node_modules\next\dist\bin\next dev
```

`scripts/seed.ts` writes the Mainnet memories and is safe to repeat. It stops if the delegate key is missing. Publishing the Move package spends mainnet SUI and is a separate step, documented in `scripts/publish.md`.

Accounts the submission still needs, all of which stay out of git:

- Tatum dashboard account and `TATUM_API_KEY` from https://tatum.io
- Walrus Memory on Mainnet at https://memory.walrus.xyz — delegate private key, account object id, and the delegate public key as `MEMWAL_AGENT_ID`
- Mainnet SUI on the publishing address
- Odds API key from https://the-odds-api.com (live odds; historical odds are a paid tier)
- A public GitHub repo and a Vercel deploy
- The form at https://recall-tatum-walrus.vercel.app (one submission, deadline 10 Nov 2026 17:00 UTC)

The wallet connects to the public Sui fullnode. Tatum's key stays on the server, which is what confirms each transaction.
