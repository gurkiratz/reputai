"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { disconnect } from "@/lib/google/oauth";

async function requireManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  if (session.user.role !== "MANAGER") throw new Error("Only a manager can change the Google connection.");
  return session.user;
}

export async function disconnectGoogleAction() {
  const user = await requireManager();
  await disconnect(user.organizationId);
  revalidatePath("/settings/google");
}

/** Links a ReputAI location to a Google Business Profile location. */
export async function linkLocationAction(formData: FormData) {
  const user = await requireManager();
  const locationId = String(formData.get("locationId"));
  const googleLocationName = String(formData.get("googleLocationName") || "") || null;
  await prisma.location.updateMany({
    where: { id: locationId, organizationId: user.organizationId },
    data: { googleLocationName },
  });
  revalidatePath("/settings/google");
}
