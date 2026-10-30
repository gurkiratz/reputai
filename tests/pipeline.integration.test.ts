import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aiComplianceCheck,
  analyzeReview,
  generateDraftReply,
  reviseDraftReply,
  type BrandVoice,
  type ReviewAnalysis,
} from "@/lib/ai";
import { checkCompliance, runReplyPipeline } from "@/lib/pipeline/graph";

// fake the AI responses so these tests don't need an API key
// The actual pipeline and compliance rules still run
vi.mock("@/lib/ai", () => ({
  aiComplianceCheck: vi.fn(),
  analyzeReview: vi.fn(),
  generateDraftReply: vi.fn(),
  reviseDraftReply: vi.fn(),
}));

const safeBody = "Thank you for your feedback. Please contact our office.";

const unsafeBody = "Your root canal was completed.";

const brandVoice: BrandVoice = {
  tone: "warm and professional",
  talkingPoints: [],
  topicsToAvoid: [],
  signOff: null,
};

const analysis: ReviewAnalysis = {
  sentiment: "POSITIVE",
  topics: [],
  escalationLevel: "NORMAL",
  escalationReason: null,
};

const input = {
  reviewText: "My appointment went well.",
  rating: 5,
  authorName: "Sample Reviewer",
  brandVoice,
  analysis: null,
};

beforeEach(() => {
  // reset the fake responses and call counts before each test
  vi.resetAllMocks();

  vi.mocked(analyzeReview).mockResolvedValue(analysis);
  vi.mocked(generateDraftReply).mockResolvedValue({
    body: safeBody,
    internalNote: null,
  });
  vi.mocked(reviseDraftReply).mockResolvedValue({
    body: safeBody,
    internalNote: null,
  });
  vi.mocked(aiComplianceCheck).mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Pipeline and compliance integration", () => {
  it("classifies a review and accepts a safe draft without revisions", async () => {
    const result = await runReplyPipeline(input);

    expect(analyzeReview).toHaveBeenCalledWith({
      reviewText: input.reviewText,
      rating: input.rating,
    });
    expect(generateDraftReply).toHaveBeenCalledWith(
      expect.objectContaining({ analysis }),
    );
    expect(result.analysis).toEqual(analysis);
    expect(result.draft.body).toBe(safeBody);
    expect(result.findings).toEqual([]);
    expect(result.revisionCount).toBe(0);
    expect(reviseDraftReply).not.toHaveBeenCalled();
  });

  it("detects an unsafe draft and accepts a safe revision", async () => {
    vi.mocked(generateDraftReply).mockResolvedValue({
      body: unsafeBody,
      internalNote: null,
    });

    const result = await runReplyPipeline(input);

    expect(reviseDraftReply).toHaveBeenCalledTimes(1);
    expect(reviseDraftReply).toHaveBeenCalledWith(
      expect.objectContaining({
        findings: expect.arrayContaining([
          expect.objectContaining({
            severity: "BLOCK",
            rule: "patient_health_detail",
          }),
        ]),
      }),
    );
    expect(result.draft.body).toBe(safeBody);
    expect(result.findings).toEqual([]);
    expect(result.revisionCount).toBe(1);
  });

  it("stops after two unsuccessful revisions and retains BLOCK flags", async () => {
    const unsafeDraft = {
      body: unsafeBody,
      internalNote: null,
    };

    // keep returning an unsafe reply to check the revision limit
    vi.mocked(generateDraftReply).mockResolvedValue(unsafeDraft);
    vi.mocked(reviseDraftReply).mockResolvedValue(unsafeDraft);

    const result = await runReplyPipeline(input);

    expect(reviseDraftReply).toHaveBeenCalledTimes(2);
    expect(result.revisionCount).toBe(2);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "BLOCK",
          rule: "patient_health_detail",
        }),
        expect.objectContaining({
          severity: "BLOCK",
          rule: "max_revisions_reached",
        }),
      ]),
    );
  });

  it("retains rule-based protection when the AI compliance call fails", async () => {
    vi.mocked(aiComplianceCheck).mockRejectedValue(
      new Error("Simulated AI outage"),
    );

    // hide the expected error message from our simulated AI outage
    vi.spyOn(console, "error").mockImplementation(() => {});

    const findings = await checkCompliance(unsafeBody, brandVoice);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "BLOCK",
          rule: "patient_health_detail",
        }),
      ]),
    );
  });

  it("preserves a model-only tone warning for human review", async () => {
    const toneWarning = {
      severity: "WARN" as const,
      rule: "defensive_tone",
      message: "A manager should review the tone.",
    };

    vi.mocked(aiComplianceCheck).mockResolvedValue([toneWarning]);

    const result = await runReplyPipeline(input);

    expect(result.findings).toEqual([toneWarning]);
    expect(result.revisionCount).toBe(0);
    expect(reviseDraftReply).not.toHaveBeenCalled();
  });
});
