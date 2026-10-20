"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ActionResult = { ok: true } | { ok: false; error: string };

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveBrandVoiceAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };
  if (session.user.role !== "MANAGER") {
    return { ok: false, error: "Only a manager can edit the brand voice profile." };
  }

  const tone = String(formData.get("tone") ?? "").trim();
  const talkingPoints = linesToList(String(formData.get("talkingPoints") ?? ""));
  const topicsToAvoid = linesToList(String(formData.get("topicsToAvoid") ?? ""));
  const signOff = String(formData.get("signOff") ?? "").trim() || null;

  if (!tone) return { ok: false, error: "Tone is required." };

  await prisma.brandVoiceProfile.upsert({
    where: { organizationId: session.user.organizationId },
    update: { tone, talkingPoints, topicsToAvoid, signOff },
    create: {
      organizationId: session.user.organizationId,
      tone,
      talkingPoints,
      topicsToAvoid,
      signOff,
    },
  });

  revalidatePath("/settings/brand-voice");
  return { ok: true };
}
