import { Suspense } from "react";
import { Receipt } from "@/components/Receipt";

export default async function ReceiptPage({ params }: { params: Promise<{ digest: string }> }) {
  const { digest } = await params;
  return (
    <Suspense fallback={<p className="quiet">Waiting on Tatum.</p>}>
      <Receipt digest={digest} />
    </Suspense>
  );
}
