# Publish veto::pick

From this repo, with the Sui CLI pointed at mainnet and a gas coin on the publishing address:

```powershell
sui client switch --env mainnet
sui client publish --gas-budget 100000000 packages/veto
```

Copy the published package id into `.env` as both `VETO_PACKAGE_ID` and `NEXT_PUBLIC_PACKAGE_ID`.

Confirm the read path before using the app:

```powershell
curl.exe -X POST https://sui-mainnet.gateway.tatum.io -H "x-api-key: $env:TATUM_API_KEY" -H "content-type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"sui_getTransactionBlock\",\"params\":[\"DIGEST\",{\"showEvents\":true}]}"
```

Replace `DIGEST` with the publish transaction. The active address on this machine was on testnet when the package was built. Do not publish until the mainnet gas coin is the one you mean to spend.
