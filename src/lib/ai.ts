import OpenAI from "openai";
import { z } from "zod";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GITHUB_MODELS_TOKEN,
      baseURL:
        process.env.GITHUB_MODELS_BASE_URL ?? "https://models.github.ai/inference",
    });
  }
  return client;
}

const MODEL = process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4o-mini";

function extractJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return parseable JSON");
  }
}

async function chatJSON(system: string, user: string): Promise<unknown> {
  const res = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  return extractJson(content);
}

export type BrandVoice = {
  tone: string;
  talkingPoints: string[];
  topicsToAvoid: string[];
  signOff?: string | null;
};

const TOPIC_TAXONOMY = [
  "wait_time",
  "billing",
  "reception",
  "cleaning",
  "parking",
  "staff_friendliness",
  "scheduling",
  "cost",
  "other",
] as const;

const AnalysisSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  topics: z.array(z.enum(TOPIC_TAXONOMY)).default([]),
  escalationLevel: z.enum([
    "NORMAL",
    "MANAGER",
    "LEGAL",
    "POSSIBLE_FAKE",
    "PRIVACY_RISK",
  ]),
  escalationReason: z.string().nullable().default(null),
});

export type ReviewAnalysis = z.infer<typeof AnalysisSchema>;

const ESCALATION_WEIGHT: Record<ReviewAnalysis["escalationLevel"], number> = {
  PRIVACY_RISK: 100,
  LEGAL: 90,
  MANAGER: 60,
  POSSIBLE_FAKE: 20,
  NORMAL: 0,
};

/** Deterministic — the model informs the inputs, but the ranking math is ours. */
export function computePriorityScore(params: {
  rating: number;
  sentiment: ReviewAnalysis["sentiment"];
  escalationLevel: ReviewAnalysis["escalationLevel"];
}): number {
  let score = ESCALATION_WEIGHT[params.escalationLevel];
  if (params.sentiment === "NEGATIVE") score += 30;
  else if (params.sentiment === "NEUTRAL") score += 10;
  score += (5 - params.rating) * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function analyzeReview(params: {
  reviewText: string;
  rating: number;
}): Promise<ReviewAnalysis> {
  const system = `You triage Google reviews for a multi-location dental group.
Classify sentiment as POSITIVE, NEUTRAL, or NEGATIVE.
Assign 0-3 topics from this exact taxonomy: ${TOPIC_TAXONOMY.join(", ")}.
Assign an escalationLevel:
- NORMAL: routine review, a standard reply is fine.
- MANAGER: needs a manager's attention (recurring operational issue, strongly negative experience) but no legal/privacy angle.
- LEGAL: the reviewer threatens legal action, mentions a lawyer, regulators, or a lawsuit.
- POSSIBLE_FAKE: generic, non-specific, spam-like review with no real detail about the visit.
- PRIVACY_RISK: the review describes the business disclosing a patient's health/treatment details to others (a PHIPA-style privacy breach), regardless of star rating.
Respond with strict JSON: {"sentiment": "...", "topics": ["..."], "escalationLevel": "...", "escalationReason": "short reason or null"}`;

  const user = `Star rating: ${params.rating}/5\nReview text: """${params.reviewText}"""`;

  const raw = await chatJSON(system, user);
  return AnalysisSchema.parse(raw);
}

const DraftSchema = z.object({
  body: z.string(),
  internalNote: z.string().nullable().default(null),
});

export type DraftReply = z.infer<typeof DraftSchema>;

export async function generateDraftReply(params: {
  reviewText: string;
  rating: number;
  authorName: string;
  brandVoice: BrandVoice;
  analysis: ReviewAnalysis;
}): Promise<DraftReply> {
  const { brandVoice, analysis } = params;

  const system = `You write public review replies for a dental group. Follow these rules exactly, with no exceptions:
1. NEVER mention or imply any specific detail about a patient's treatment, diagnosis, medication, test results, or health condition — even if the reviewer brought it up themselves. This is a hard dental-privacy rule.
2. NEVER admit legal fault or liability on behalf of the business.
3. NEVER make a guarantee or promise the business may not be able to keep.
4. Match this brand voice: "${brandVoice.tone}".
5. Where relevant, naturally weave in these talking points: ${brandVoice.talkingPoints.join("; ") || "(none specified)"}.
6. Never mention these topics: ${brandVoice.topicsToAvoid.join("; ") || "(none specified)"}.
7. Keep the public reply to 2-4 sentences.
8. If escalationLevel is LEGAL or PRIVACY_RISK, keep the public reply short, sincere, and non-specific, and invite the reviewer to contact the clinic directly by phone or email to resolve it privately — do not restate what they alleged.
9. End with this sign-off if provided: "${brandVoice.signOff ?? ""}".
10. Also produce a short internal staff-facing note (not shown publicly) suggesting a concrete follow-up action for staff.

Respond with strict JSON: {"body": "the public reply", "internalNote": "the internal note or null"}`;

  const user = `Reviewer: ${params.authorName}
Star rating: ${params.rating}/5
Review text: """${params.reviewText}"""
Sentiment: ${analysis.sentiment}
Topics: ${analysis.topics.join(", ") || "none"}
Escalation level: ${analysis.escalationLevel}
Escalation reason: ${analysis.escalationReason ?? "n/a"}`;

  const raw = await chatJSON(system, user);
  return DraftSchema.parse(raw);
}

/**
 * Revise node prompt: rewrites a draft so it no longer breaks the rules the
 * compliance check found. Used by the LangGraph revise loop (max 2 passes).
 */
export async function reviseDraftReply(params: {
  draft: DraftReply;
  findings: { rule: string; message: string }[];
  reviewText: string;
  brandVoice: BrandVoice;
}): Promise<DraftReply> {
  const system = `You fix public review replies for a dental group so they pass a compliance check.
Rewrite the reply to remove every problem listed. Keep the same intent, 2-4 sentences, and this brand tone: "${params.brandVoice.tone}".
Never mention a patient's treatment, diagnosis or health details. Never admit legal fault. Never promise what the clinic may not be able to keep. Do not argue with the reviewer.
End with this sign-off if provided: "${params.brandVoice.signOff ?? ""}".
Respond with strict JSON: {"body": "the revised public reply", "internalNote": "keep or improve the internal note, or null"}`;

  const user = `Original review: """${params.reviewText}"""
Current reply: """${params.draft.body}"""
Current internal note: ${params.draft.internalNote ?? "none"}
Problems to fix:
${params.findings.map((f) => `- ${f.rule}: ${f.message}`).join("\n")}`;

  const raw = await chatJSON(system, user);
  return DraftSchema.parse(raw);
}

const AIComplianceSchema = z.object({
  findings: z
    .array(
      z.object({
        rule: z.string(),
        message: z.string(),
      }),
    )
    .default([]),
});

export type AIComplianceFinding = { severity: "WARN"; rule: string; message: string };

/**
 * A softer, model-based second opinion on tone/brand fit. The hard,
 * safety-critical rules (patient privacy, liability, promises) are
 * enforced deterministically in lib/compliance.ts and never rely on
 * this call succeeding.
 */
export async function aiComplianceCheck(params: {
  replyBody: string;
  brandVoice: BrandVoice;
}): Promise<AIComplianceFinding[]> {
  const system = `You are a brand-compliance reviewer for a dental group's public review replies.
Brand tone should be: "${params.brandVoice.tone}".
Topics that must never appear: ${params.brandVoice.topicsToAvoid.join("; ") || "(none specified)"}.
Flag anything off-brand, overly casual, defensive, or that could embarrass the business. Do not flag things already about patient privacy, liability, or guarantees — those are handled elsewhere.
Respond with strict JSON: {"findings": [{"rule": "short_snake_case_key", "message": "one sentence explanation"}]} — return an empty array if the reply is fine.`;

  const raw = await chatJSON(system, `Reply to review:\n"""${params.replyBody}"""`);
  const parsed = AIComplianceSchema.parse(raw);
  return parsed.findings.map((f) => ({ severity: "WARN" as const, ...f }));
}
