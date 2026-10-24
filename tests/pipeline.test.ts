import { beforeEach, describe, expect, it, vi } from "vitest";

const ai = vi.hoisted(() => ({
  analyzeReview: vi.fn(),
  generateDraftReply: vi.fn(),
  reviseDraftReply: vi.fn(),
  aiComplianceCheck: vi.fn(),
}));
vi.mock("@/lib/ai", () => ai);

import { MAX_REVISIONS, runReplyPipeline } from "@/lib/pipeline/graph";

const params = {
  reviewText: "Long wait.",
  rating: 2,
  authorName: "Sam",
  brandVoice: { tone: "warm", talkingPoints: [], topicsToAvoid: [], signOff: null },
  analysis: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  ai.analyzeReview.mockResolvedValue({ sentiment: "NEGATIVE", topics: ["wait_time"], escalationLevel: "NORMAL", escalationReason: null });
  ai.aiComplianceCheck.mockResolvedValue([]);
});

describe("runReplyPipeline", () => {
  it("passes a clean draft with no revisions", async () => {
    ai.generateDraftReply.mockResolvedValue({ body: "Thank you, Sam.", internalNote: null });
    const result = await runReplyPipeline(params);
    expect(result.revisionCount).toBe(0);
    expect(result.findings).toEqual([]);
    expect(ai.reviseDraftReply).not.toHaveBeenCalled();
  });

  it("revises a failing draft once, then passes", async () => {
    ai.generateDraftReply.mockResolvedValue({ body: "Sorry about your root canal.", internalNote: null });
    ai.reviseDraftReply.mockResolvedValue({ body: "Sorry about the wait.", internalNote: null });
    const result = await runReplyPipeline(params);
    expect(result.revisionCount).toBe(1);
    expect(result.draft.body).toBe("Sorry about the wait.");
    expect(result.findings).toEqual([]);
  });

  it("blocks a draft that still fails after the maximum revisions", async () => {
    ai.generateDraftReply.mockResolvedValue({ body: "Your root canal is fine.", internalNote: null });
    ai.reviseDraftReply.mockResolvedValue({ body: "Your root canal is fine.", internalNote: null });
    const result = await runReplyPipeline(params);
    expect(result.revisionCount).toBe(MAX_REVISIONS);
    expect(result.findings.at(-1)).toMatchObject({ severity: "BLOCK", rule: "max_revisions_reached" });
  });

  it("keeps rule results when the model compliance check fails", async () => {
    ai.generateDraftReply.mockResolvedValue({ body: "It was our fault.", internalNote: null });
    ai.reviseDraftReply.mockResolvedValue({ body: "Thank you.", internalNote: null });
    ai.aiComplianceCheck.mockRejectedValue(new Error("model down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runReplyPipeline(params);
    expect(result.draft.body).toBe("Thank you.");
  });
});
