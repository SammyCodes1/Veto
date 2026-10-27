export default function LetterPage() {
  return (
    <article className="letter">
      <p className="meta">Letter · Total Recall</p>
      <h1>What Veto refuses.</h1>
      <p>
        Veto is a pick logger for NBA and NFL markets. A log becomes real only when two prices exist:
        a bookmaker price, and an onchain Polymarket price. The book is The Odds API, de-vigged.
        The chain is Polymarket through Tatum&apos;s prediction API. Kalshi is read through the same
        Tatum API when a slate row names a ticker, and the screen calls it Exchange, not Book.
      </p>
      <p>
        Closing-line value is the close minus the entry, in percentage points, on the side you bought.
        Positive means the close moved your way. The stamp uses that mean. It does not use win rate.
        A winner logged at a bad price still hurts the cell.
      </p>
      <h2>The rule</h2>
      <p>Under five graded tickets, the cell is learning and the button stays open.</p>
      <p>At five or more, a mean of −3.0 points or worse is a veto. The button dies.</p>
      <p>A mean of +2.0 or better is an allow. Between those lines the cell is flat and the button stays open.</p>
      <p>Cold start hides the record for the demo. It does not delete the Mainnet memories.</p>
      <h2>Tatum</h2>
      <p>
        Live chain prices, candles, and resolution come from <span className="digest">api.tatum.io/v4/data/prediction</span>.
        A pick is not accepted until Tatum Sui RPC, at <span className="digest">sui-mainnet.gateway.tatum.io</span>,
        returns the transaction, the <span className="digest">PickPlaced</span> event, the sender, and a timestamp
        before the market close. The browser wallet talks to the public Sui fullnode so the Tatum key never
        ships to the client. The judging path is the server read.
      </p>
      <h2>Walrus</h2>
      <p>
        Graded seed tickets and live placements are written to Walrus Memory on Mainnet through the
        managed relayer. Ticket memories live in <span className="digest">veto.tickets</span>. When a grade
        changes a stamp, a new cell rule is appended in <span className="digest">veto.cells</span>. Older
        rules stay. Recall quotes them on the ticket. The arithmetic uses the seed file plus objects read
        over RPC, because semantic recall is a citation layer, not a ledger.
      </p>
      <h2>The seed</h2>
      <p>
        Chain timestamps cannot be backdated, so the historical record is a seed. Each row is a real
        Polymarket print: an entry candle and the closing print from that market&apos;s public price history.
        The veto cell sits far past −3 because several of those closes finished near zero after the entry was still a coin flip. The rule only needs −3. The script does not invent prices,
        and it does not publish fake historical transactions. Book odds are not stored on seed rows, because
        the historical book feed is not on the free Odds API tier. Live logs require a live book.
      </p>
      <h2>What changed</h2>
      <p>
        With the record hidden, an NFL moneyline can be logged. With the record showing, the same market
        is refused, and the card quotes the memories that refused it. An NBA total with a positive record
        stays open. That flip is the product.
      </p>
    </article>
  );
}
