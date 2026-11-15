"use client";

import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { runSlaCheckAction } from "../dashboard/actions";

export function RunSlaButton() {
  const router = useRouter();
  const showToast = useToast();
  return (
    <Button
      label="Run SLA check now"
      variant="secondary"
      size="sm"
      clickAction={async () => {
        const r = await runSlaCheckAction();
        showToast({
          type: "info",
          body:
            r.newAlerts === 0
              ? "SLA check done. No new overdue reviews."
              : `SLA check done. ${r.newAlerts} new alert${r.newAlerts === 1 ? "" : "s"}${r.emailed ? ", email sent" : ""}.`,
        });
        router.refresh();
      }}
    />
  );
}
