"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { paymentAction } from "@/lib/actions/finance";
import { Button } from "@/components/ui/button";

export function PaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function act(op: "confirm" | "cancel" | "revert" | "markPaid") {
    start(async () => {
      await paymentAction(op, paymentId);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      {status === "pending" && (
        <>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => act("confirm")}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("cancel")}>
            Void
          </Button>
        </>
      )}
      {status === "confirmed" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("revert")}>
          Revert
        </Button>
      )}
    </div>
  );
}
