import { prisma } from "@/lib/prisma";
import { getReviewProvider } from "@/lib/reviews/provider";
import { type BrandVoice, type ReviewAnalysis } from "@/lib/ai";
import { type ComplianceFinding } from "@/lib/compliance";
import { checkCompliance, runReplyPipeline } from "@/lib/pipeline/graph";

async function requireBrandVoice(organizationId: string): Promise<BrandVoice> {
  const profile = await prisma.brandVoiceProfile.findUnique({
    where: { organizationId },
  });
  if (!profile) {
    return {
      tone: "warm, professional, and concise",
      talkingPoints: [],
      topicsToAvoid: [],
      signOff: null,
    };
  }
  return {
    tone: profile.tone,
    talkingPoints: profile.talkingPoints,
    topicsToAvoid: profile.topicsToAvoid,
    signOff: profile.signOff,
  };
}

async function saveComplianceFlags(replyId: string, findings: ComplianceFinding[]) {
  await prisma.complianceFlag.deleteMany({ where: { replyId } });
  if (findings.length === 0) return;
  await prisma.complianceFlag.createMany({
    data: findings.map((f) => ({
      replyId,
      severity: f.severity,
      rule: f.rule,
      message: f.message,
    })),
  });
}

const runFullComplianceCheck = checkCompliance;

export async function generateAIDraft(reviewId: string, userId: string) {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: { location: true },
  });
  const brandVoice = await requireBrandVoice(review.location.organizationId);

  // Classify (if not triaged yet) → draft → compliance → revise loop (max 2).
  const result = await runReplyPipeline({
    reviewText: review.text,
    rating: review.rating,
    authorName: review.authorName,
    brandVoice,
    analysis: review.sentiment
      ? {
          sentiment: review.sentiment,
          topics: review.topics as ReviewAnalysis["topics"],
          escalationLevel: review.escalationLevel,
          escalationReason: review.escalationReason,
        }
      : null,
  });

  if (!review.sentiment) {
    await prisma.review.update({
      where: { id: review.id },
      data: {
        sentiment: result.analysis.sentiment,
        topics: result.analysis.topics,
        escalationLevel: result.analysis.escalationLevel,
        escalationReason: result.analysis.escalationReason,
      },
    });
  }

  const reply = await prisma.reply.create({
    data: {
      reviewId: review.id,
      body: result.draft.body,
      internalNote: result.draft.internalNote,
      draftedById: userId,
      revisionCount: result.revisionCount,
    },
  });

  await saveComplianceFlags(reply.id, result.findings);

  if (review.status === "NEW") {
    await prisma.review.update({ where: { id: review.id }, data: { status: "DRAFTED" } });
  }

  return reply;
}

export async function applyTemplate(reviewId: string, templateId: string, userId: string) {
  const [review, template] = await Promise.all([
    prisma.review.findUniqueOrThrow({ where: { id: reviewId }, include: { location: true } }),
    prisma.replyTemplate.findUniqueOrThrow({ where: { id: templateId } }),
  ]);
  const brandVoice = await requireBrandVoice(review.location.organizationId);

  const body = template.body
    .replaceAll("{{author_name}}", review.authorName)
    .replaceAll("{{sign_off}}", brandVoice.signOff ?? "");

  const reply = await prisma.reply.create({
    data: { reviewId: review.id, body, draftedById: userId },
  });

  const findings = await runFullComplianceCheck(body, brandVoice);
  await saveComplianceFlags(reply.id, findings);

  if (review.status === "NEW") {
    await prisma.review.update({ where: { id: review.id }, data: { status: "DRAFTED" } });
  }

  return reply;
}

export async function editDraft(replyId: string, body: string) {
  const reply = await prisma.reply.findUniqueOrThrow({
    where: { id: replyId },
    include: { review: { include: { location: true } } },
  });
  if (!reply.isDraft) {
    throw new Error("This reply has already been posted and can no longer be edited.");
  }
  const brandVoice = await requireBrandVoice(reply.review.location.organizationId);

  const updated = await prisma.reply.update({ where: { id: replyId }, data: { body } });
  const findings = await runFullComplianceCheck(body, brandVoice);
  await saveComplianceFlags(replyId, findings);

  return updated;
}

export async function submitForApproval(reviewId: string) {
  const reply = await prisma.reply.findFirst({
    where: { reviewId, isDraft: true },
    orderBy: { createdAt: "desc" },
    include: { complianceFlags: true },
  });
  if (!reply) throw new Error("No draft reply to submit.");
  const hasBlock = reply.complianceFlags.some((f) => f.severity === "BLOCK");
  if (hasBlock) {
    throw new Error(
      "This draft is blocked by the compliance checker and cannot be submitted for approval. Edit the reply to remove the flagged content.",
    );
  }
  await prisma.review.update({ where: { id: reviewId }, data: { status: "AWAITING_APPROVAL" } });
  return reply;
}

export async function sendBackToDraft(reviewId: string) {
  await prisma.review.update({ where: { id: reviewId }, data: { status: "DRAFTED" } });
}

export async function approveAndPost(reviewId: string, managerId: string) {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: { location: true },
  });
  const reply = await prisma.reply.findFirst({
    where: { reviewId, isDraft: true },
    orderBy: { createdAt: "desc" },
    include: { complianceFlags: true },
  });
  if (!reply) throw new Error("No draft reply to approve.");
  const hasBlock = reply.complianceFlags.some((f) => f.severity === "BLOCK");
  if (hasBlock) {
    throw new Error("This reply is blocked by the compliance checker and cannot be approved.");
  }

  const provider = getReviewProvider();
  const posted = await provider.postReply({
    location: review.location,
    externalReviewId: review.externalId,
    body: reply.body,
  });

  const now = new Date();
  const updated = await prisma.reply.update({
    where: { id: reply.id },
    data: {
      approvedById: managerId,
      approvedAt: now,
      postedAt: posted.postedAt,
      isDraft: false,
    },
  });
  await prisma.review.update({ where: { id: reviewId }, data: { status: "POSTED" } });

  return updated;
}
