"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createTemplateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;

  await prisma.replyTemplate.create({
    data: { organizationId: session.user.organizationId, title, body },
  });

  revalidatePath("/settings/templates");
}

export async function deleteTemplateAction(templateId: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.replyTemplate.deleteMany({
    where: { id: templateId, organizationId: session.user.organizationId },
  });

  revalidatePath("/settings/templates");
}
