"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncLocation } from "@/lib/reviews/sync";

type ActionResult = { ok: true; created: number } | { ok: false; error: string };

export async function syncLocationAction(locationId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Not authenticated.");

    const location = await prisma.location.findFirst({
      where: { id: locationId, organizationId: session.user.organizationId },
    });
    if (!location) throw new Error("Location not found.");

    const result = await syncLocation(locationId);
    revalidatePath("/settings/locations");
    revalidatePath("/dashboard");
    return { ok: true, created: result.created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed." };
  }
}

export async function createLocationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) return;

  await prisma.location.create({
    data: { organizationId: session.user.organizationId, name, address },
  });

  revalidatePath("/settings/locations");
}
