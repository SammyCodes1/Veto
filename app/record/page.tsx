import { Suspense } from "react";
import { RecordView } from "@/components/RecordView";

export default function RecordPage() {
  return (
    <>
      <p className="notice">
        Historical rows were written by scripts/build-seed.ts from Polymarket prints. Their chain time is not backdated.
        Live rows appear after a wallet transaction that Tatum Sui RPC can read.
      </p>
      <Suspense fallback={<p className="quiet">Opening the record.</p>}>
        <RecordView />
      </Suspense>
    </>
  );
}
