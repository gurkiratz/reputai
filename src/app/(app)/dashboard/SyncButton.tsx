"use client";

import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { syncAllLocationsAction } from "./actions";

export function SyncButton() {
  const router = useRouter();
  const showToast = useToast();

  return (
    <Button
      label="Sync reviews now"
      variant="primary"
      size="sm"
      clickAction={async () => {
        const result = await syncAllLocationsAction();
        showToast({
          type: "info",
          body:
            result.totalCreated > 0
              ? `Synced — ${result.totalCreated} new review${result.totalCreated === 1 ? "" : "s"}.`
              : "Synced — no new reviews.",
        });
        router.refresh();
      }}
    />
  );
}
