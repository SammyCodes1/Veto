import { Suspense } from "react";
import { Ticket } from "@/components/Ticket";

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="quiet">Reading the market.</p>}>
      <Ticket id={id} />
    </Suspense>
  );
}
