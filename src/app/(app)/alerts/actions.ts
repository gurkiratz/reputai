"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";

export async function markAlertReadAction(alertId: string) {
  const user = await requireUser();
  await prisma.alert.updateMany({
    where: { id: alertId, organizationId: user.organizationId },
    data: { readAt: new Date() },
  });
  revalidatePath("/alerts");
}

export async function markAllAlertsReadAction() {
  const user = await requireUser();
  await prisma.alert.updateMany({
    where: { organizationId: user.organizationId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/alerts");
}
