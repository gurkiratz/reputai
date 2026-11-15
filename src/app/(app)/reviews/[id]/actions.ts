"use server";

import { revalidatePath } from "next/cache";
import {
  generateAIDraft,
  applyTemplate,
  editDraft,
  submitForApproval,
  sendBackToDraft,
  approveAndPost,
} from "@/lib/reply-service";
import { requireUser, requireManager, assertReviewInOrg, assertReplyInOrg } from "@/lib/guard";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

type ActionResult = { ok: true } | { ok: false; error: string };

function errorResult(err: unknown): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

function refresh(reviewId: string, reports = false) {
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath("/dashboard");
  if (reports) revalidatePath("/reports");
}

export async function generateDraftAction(reviewId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertReviewInOrg(reviewId, user.organizationId);
    await enforceRateLimit(`ai:${user.id}`, LIMITS.aiDraft);
    await generateAIDraft(reviewId, user.id);
    refresh(reviewId);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function applyTemplateAction(reviewId: string, templateId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertReviewInOrg(reviewId, user.organizationId);
    await applyTemplate(reviewId, templateId, user.id, user.organizationId);
    refresh(reviewId);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function saveDraftAction(reviewId: string, replyId: string, body: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertReplyInOrg(replyId, reviewId, user.organizationId);
    if (!body.trim()) throw new Error("The reply cannot be empty.");
    if (body.length > 4000) throw new Error("The reply is too long (4,000 characters maximum).");
    await editDraft(replyId, body);
    refresh(reviewId);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function submitForApprovalAction(reviewId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertReviewInOrg(reviewId, user.organizationId);
    await submitForApproval(reviewId);
    refresh(reviewId);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function sendBackAction(reviewId: string): Promise<ActionResult> {
  try {
    const user = await requireManager("Only a manager can send a draft back.");
    await assertReviewInOrg(reviewId, user.organizationId);
    await sendBackToDraft(reviewId);
    refresh(reviewId);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

export async function approveAndPostAction(
  reviewId: string,
  override?: { reason: string; note?: string },
): Promise<ActionResult> {
  try {
    const user = await requireManager("Only a manager can approve replies.");
    await assertReviewInOrg(reviewId, user.organizationId);
    await approveAndPost(reviewId, user.id, override);
    refresh(reviewId, true);
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}
