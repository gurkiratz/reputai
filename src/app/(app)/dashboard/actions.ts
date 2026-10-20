"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { syncOrganization } from "@/lib/reviews/sync";

export async function syncAllLocationsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const results = await syncOrganization(session.user.organizationId);
  revalidatePath("/dashboard");

  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  return { totalCreated };
}
