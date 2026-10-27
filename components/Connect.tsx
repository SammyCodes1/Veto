"use client";

import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useState } from "react";

export function Connect() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [open, setOpen] = useState(false);

  if (account) {
    return (
      <button className="text-button" type="button" onClick={() => disconnect()}>
        {account.address.slice(0, 6)}…{account.address.slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button className="text-button" type="button" onClick={() => setOpen(true)}>Connect</button>
      <ConnectModal trigger={<span />} open={open} onOpenChange={setOpen} />
    </>
  );
}
