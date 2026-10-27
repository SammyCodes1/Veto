# What Veto refuses

Veto is a pick logger for NBA and NFL markets. A log becomes real only when two prices exist: a bookmaker price, and an onchain Polymarket price. The book is The Odds API, de-vigged. The chain is Polymarket through Tatum's prediction API. Kalshi is read through the same Tatum API when a slate row names a ticker, and the screen calls it Exchange, not Book.

Closing-line value is the close minus the entry, in percentage points, on the side you bought. Positive means the close moved your way. The stamp uses that mean. It does not use win rate. A winner logged at a bad price still hurts the cell.

## The rule

Under five graded tickets, the cell is learning and the button stays open.

At five or more, a mean of −3.0 points or worse is a veto. The button dies.

A mean of +2.0 or better is an allow. Between those lines the cell is flat and the button stays open.

Cold start hides the record for the demo. It does not delete the Mainnet memories.

## Tatum

Live chain prices, candles, and resolution come from `api.tatum.io/v4/data/prediction`. A pick is not accepted until Tatum Sui RPC, at `sui-mainnet.gateway.tatum.io`, returns the transaction, the `PickPlaced` event, the sender, and a timestamp before the market close. The browser wallet talks to the public Sui fullnode so the Tatum key never ships to the client. The judging path is the server read.

## Walrus

Graded seed tickets and live placements are written to Walrus Memory on Mainnet through the managed relayer. Ticket memories live in `veto.tickets`. When a grade changes a stamp, a new cell rule is appended in `veto.cells`. Older rules stay. Recall quotes them on the ticket. The arithmetic uses the seed file plus objects read over RPC, because semantic recall is a citation layer, not a ledger.

## The seed

Chain timestamps cannot be backdated, so the historical record is a seed. Each row is a real Polymarket print: an entry candle and the closing print from that market's public price history. The veto cell sits far past −3 because several of those closes finished near zero after the entry was still a coin flip. The rule only needs −3. The script does not invent prices, and it does not publish fake historical transactions. Book odds are not stored on seed rows, because the historical book feed is not on the free Odds API tier. Live logs require a live book.

## What changed

With the record hidden, an NFL moneyline can be logged. With the record showing, the same market is refused, and the card quotes the memories that refused it. An NBA total with a positive record stays open. That flip is the product.
