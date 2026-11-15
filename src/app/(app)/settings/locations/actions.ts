"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireManager } from "@/lib/guard";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { syncLocation } from "@/lib/reviews/sync";

type ActionResult = { ok: true; created: number } | { ok: false; error: string };

export async function syncLocationAction(locationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const location = await prisma.location.findFirst({
      where: { id: locationId, organizationId: user.organizationId },
    });
    if (!location) throw new Error("Location not found.");
    await enforceRateLimit(`sync:${user.organizationId}`, LIMITS.sync);

    let result;
    try {
      result = await syncLocation(locationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logAudit({ organizationId: user.organizationId, actorId: user.id, action: "SYNC_ERROR", targetType: "Location", targetId: locationId, details: { message } });
      throw err;
    }
    revalidatePath("/settings/locations");
    revalidatePath("/dashboard");
    return { ok: true, created: result.created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed." };
  }
}

export async function createLocationAction(formData: FormData) {
  const user = await requireManager("Only a manager can add a location.");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name || name.length > 120) return;

  await prisma.location.create({
    data: { organizationId: user.organizationId, name, address },
  });

  revalidatePath("/settings/locations");
}
