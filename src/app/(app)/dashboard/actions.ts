"use server";

import { revalidatePath } from "next/cache";
import { syncOrganization } from "@/lib/reviews/sync";
import { requireUser, requireManager } from "@/lib/guard";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { runSlaCheck } from "@/lib/jobs";

export async function syncAllLocationsAction() {
  const user = await requireUser();
  await enforceRateLimit(`sync:${user.organizationId}`, LIMITS.sync);
  try {
    const results = await syncOrganization(user.organizationId);
    revalidatePath("/dashboard");
    return { totalCreated: results.reduce((sum, r) => sum + r.created, 0) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAudit({ organizationId: user.organizationId, actorId: user.id, action: "SYNC_ERROR", details: { message, source: "manual" } });
    throw err;
  }
}

/** Runs the SLA check now (the same job the scheduler calls). Used in the demo. */
export async function runSlaCheckAction() {
  await requireManager("Only a manager can run the SLA check.");
  const result = await runSlaCheck();
  revalidatePath("/dashboard");
  revalidatePath("/alerts");
  return result;
}
