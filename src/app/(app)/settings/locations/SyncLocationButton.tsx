"use client";

import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { syncLocationAction } from "./actions";

export function SyncLocationButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const showToast = useToast();

  return (
    <Button
      label="Sync now"
      variant="secondary"
      size="sm"
      clickAction={async () => {
        const result = await syncLocationAction(locationId);
        showToast({
          type: result.ok ? "info" : "error",
          body: result.ok
            ? `${result.created} new review${result.created === 1 ? "" : "s"}.`
            : result.error,
        });
        router.refresh();
      }}
    />
  );
}
