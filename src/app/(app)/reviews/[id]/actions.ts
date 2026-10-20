"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateAIDraft,
  applyTemplate,
  editDraft,
  submitForApproval,
  sendBackToDraft,
  approveAndPost,
} from "@/lib/reply-service";

type ActionResult = { ok: true } | { ok: false; error: string };

function errorResult(err: unknown): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session;
}

export async function generateDraftAction(reviewId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await generateAIDraft(reviewId, session.user.id);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function applyTemplateAction(
  reviewId: string,
  templateId: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await applyTemplate(reviewId, templateId, session.user.id);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function saveDraftAction(
  reviewId: string,
  replyId: string,
  body: string,
): Promise<ActionResult> {
  try {
    await requireSession();
    await editDraft(replyId, body);
    revalidatePath(`/reviews/${reviewId}`);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function submitForApprovalAction(reviewId: string): Promise<ActionResult> {
  try {
    await requireSession();
    await submitForApproval(reviewId);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function sendBackAction(reviewId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (session.user.role !== "MANAGER") throw new Error("Only a manager can send a draft back.");
    await sendBackToDraft(reviewId);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function approveAndPostAction(reviewId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (session.user.role !== "MANAGER") throw new Error("Only a manager can approve replies.");
    await approveAndPost(reviewId, session.user.id);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function listTemplatesForOrg(organizationId: string) {
  return prisma.replyTemplate.findMany({
    where: { organizationId },
    orderBy: { title: "asc" },
  });
}
