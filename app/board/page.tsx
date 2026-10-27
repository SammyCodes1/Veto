import { Suspense } from "react";
import { Board, ColdStart } from "@/components/Board";

export default function BoardPage() {
  return (
    <>
      <header className="lede">
        <p className="eyebrow">Game card</p>
        <h1>Open games.</h1>
        <p>An open pill can be logged. A veto card has already been refused.</p>
        <Suspense fallback={<span className="switch">Cold start</span>}>
          <ColdStart />
        </Suspense>
      </header>
      <Suspense fallback={<p className="quiet">Opening the board.</p>}>
        <Board />
      </Suspense>
    </>
  );
}
