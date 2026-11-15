"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/guard";
import { runComplianceRules } from "@/lib/compliance";

type ActionResult = { ok: true } | { ok: false; error: string };

/** FR11: the compliance rules also run on templates. A template with a BLOCK rule cannot be saved. */
export async function createTemplateAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireManager("Only a manager can add templates.");
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!title || !body) return { ok: false, error: "Title and body are required." };
    if (title.length > 120 || body.length > 2000) return { ok: false, error: "The template is too long." };

    const voice = await prisma.brandVoiceProfile.findUnique({ where: { organizationId: user.organizationId } });
    const findings = runComplianceRules(body, { topicsToAvoid: voice?.topicsToAvoid ?? [] });
    const block = findings.find((f) => f.severity === "BLOCK");
    if (block) return { ok: false, error: `Blocked by the compliance check: ${block.message}` };

    await prisma.replyTemplate.create({ data: { organizationId: user.organizationId, title, body } });
    revalidatePath("/settings/templates");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteTemplateAction(templateId: string) {
  const user = await requireManager("Only a manager can delete templates.");
  await prisma.replyTemplate.deleteMany({
    where: { id: templateId, organizationId: user.organizationId },
  });
  revalidatePath("/settings/templates");
}
