import Link from "next/link";

export default function Page() {
  return (
    <article className="home">
      <header className="hero">
        <div className="hero-copy">
          <p className="kicker">Live odds intelligence · NBA / NFL</p>
          <h1>Know when to <em>sit this one out.</em></h1>
          <p>Veto compares the book to the chain, then keeps a running score on every decision. Bad closes lose the next log.</p>
          <div className="hero-actions">
            <Link className="switch" href="/board">View live board →</Link>
            <Link className="ghost" href="/letter">How Veto works</Link>
          </div>
        </div>
        <aside className="stat">
          <div className="stat-topline">
            <p className="kicker">Cell discipline</p>
            <span className="live-dot">Live rule</span>
          </div>
          <p className="stat-num">−3.0</p>
          <p className="stat-label">mean CLV triggers a veto</p>
          <ul>
            <li><span>Under 5</span><b>Open</b></li>
            <li><span>+2 or better</span><b>Allow</b></li>
            <li><span>Between</span><b>Flat</b></li>
          </ul>
        </aside>
      </header>

      <section className="how">
        <div className="section-heading">
          <p className="kicker">Game plan</p>
          <h2>Three plays. One honest record.</h2>
        </div>
        <ol>
          <li><span>01</span><div><h3>Size</h3><p>Pick a side and a declared size. The size is stored on the object. No coins move.</p></div></li>
          <li><span>02</span><div><h3>Sign</h3><p>You sign on Sui. The log counts only if Tatum reads that transaction before the close.</p></div></li>
          <li><span>03</span><div><h3>Grade</h3><p>After the market resolves, a second signature is what enters the cell.</p></div></li>
        </ol>
      </section>

      <section className="pair">
        <article><p className="kicker">01 · Book</p><h2>The posted price.</h2><p>A US book, de-vigged. If the number is missing, the button stays dead. Veto does not invent one.</p></article>
        <article><p className="kicker">02 · Chain</p><h2>The market price.</h2><p>The onchain price comes through Tatum. The two numbers sit together. The gap is the story.</p></article>
      </section>

      <section className="note">
        <p className="kicker">No box-score revisionism</p>
        <h2>The record stays honest.</h2>
        <p>Old rows are real Polymarket prints, labeled seed. They are not backdated chain transactions. Cold start hides that record. It does not delete it. New games join the card while the book still has a matching price. A win at a bad price still hurts the cell.</p>
      </section>
    </article>
  );
}
