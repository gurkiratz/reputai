import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import {
  aiComplianceCheck,
  analyzeReview,
  generateDraftReply,
  reviseDraftReply,
  type BrandVoice,
  type DraftReply,
  type ReviewAnalysis,
} from "@/lib/ai";
import { runComplianceRules, type ComplianceFinding } from "@/lib/compliance";

/**
 * The ReputAI reply pipeline (Phase I):
 *
 *   START → classify → draft → compliance ─┬─ pass ───────────→ END
 *                                          ├─ fail, < 2 revs → revise → compliance
 *                                          └─ fail, 2 revs ──→ blockMaxRevisions → END
 *
 * Rule-based checks (lib/compliance.ts) always run; the model-based check is
 * a softer second opinion and never blocks the pipeline if it fails.
 * A draft that still fails after MAX_REVISIONS is marked BLOCK, so it can
 * never be posted — a manager must see the flags and decide (Stakeholder
 * Review 1, decision D3).
 */
export const MAX_REVISIONS = 2;

const PipelineState = Annotation.Root({
  reviewText: Annotation<string>,
  rating: Annotation<number>,
  authorName: Annotation<string>,
  brandVoice: Annotation<BrandVoice>,
  analysis: Annotation<ReviewAnalysis | null>,
  draft: Annotation<DraftReply | null>,
  findings: Annotation<ComplianceFinding[]>,
  revisionCount: Annotation<number>,
});

type State = typeof PipelineState.State;

// Findings from the deterministic rules send the draft back for revision.
// Model-only tone notes stay as WARN flags for the human reviewer.
const RULE_KEYS = new Set([
  "patient_health_detail",
  "liability_admission",
  "unkeepable_promise",
  "off_brand_topic",
]);

function needsRevision(findings: ComplianceFinding[]) {
  return findings.some((f) => RULE_KEYS.has(f.rule));
}

async function classify(state: State): Promise<Partial<State>> {
  if (state.analysis) return {};
  const analysis = await analyzeReview({
    reviewText: state.reviewText,
    rating: state.rating,
  });
  return { analysis };
}

async function draft(state: State): Promise<Partial<State>> {
  const reply = await generateDraftReply({
    reviewText: state.reviewText,
    rating: state.rating,
    authorName: state.authorName,
    brandVoice: state.brandVoice,
    analysis: state.analysis!,
  });
  return { draft: reply };
}

async function compliance(state: State): Promise<Partial<State>> {
  return {
    findings: await checkCompliance(state.draft!.body, state.brandVoice),
  };
}

async function revise(state: State): Promise<Partial<State>> {
  const revised = await reviseDraftReply({
    draft: state.draft!,
    findings: state.findings,
    reviewText: state.reviewText,
    brandVoice: state.brandVoice,
  });
  return { draft: revised, revisionCount: state.revisionCount + 1 };
}

async function blockMaxRevisions(state: State): Promise<Partial<State>> {
  return {
    findings: [
      ...state.findings,
      {
        severity: "BLOCK",
        rule: "max_revisions_reached",
        message: `The draft still failed the compliance check after ${MAX_REVISIONS} automatic revisions. Edit the reply by hand before it can be approved.`,
      },
    ],
  };
}

function afterCompliance(state: State) {
  if (!needsRevision(state.findings)) return "pass";
  return state.revisionCount < MAX_REVISIONS ? "revise" : "block";
}

// "draft" is already a state field, so the node needs a different name
const replyGraph = new StateGraph(PipelineState)
  .addNode("classify", classify)
  .addNode("generateDraft", draft)
  .addNode("compliance", compliance)
  .addNode("revise", revise)
  .addNode("blockMaxRevisions", blockMaxRevisions)
  .addEdge(START, "classify")
  .addEdge("classify", "generateDraft")
  .addEdge("generateDraft", "compliance")
  .addConditionalEdges("compliance", afterCompliance, {
    pass: END,
    revise: "revise",
    block: "blockMaxRevisions",
  })
  .addEdge("revise", "compliance")
  .addEdge("blockMaxRevisions", END)
  .compile();

const triageGraph = new StateGraph(PipelineState)
  .addNode("classify", classify)
  .addEdge(START, "classify")
  .addEdge("classify", END)
  .compile();

/** Rule checks plus the model-based tone check (skipped if the model call fails). */
export async function checkCompliance(
  body: string,
  brandVoice: BrandVoice,
): Promise<ComplianceFinding[]> {
  const ruleFindings = runComplianceRules(body, brandVoice);
  try {
    return [
      ...ruleFindings,
      ...(await aiComplianceCheck({ replyBody: body, brandVoice })),
    ];
  } catch (err) {
    console.error(
      "AI compliance check failed, continuing with rule-based results only:",
      err,
    );
    return ruleFindings;
  }
}

const emptyState = {
  authorName: "",
  brandVoice: { tone: "", talkingPoints: [], topicsToAvoid: [] } as BrandVoice,
  analysis: null,
  draft: null,
  findings: [],
  revisionCount: 0,
};

/** Classify node only — used by review sync. */
export async function runTriage(params: {
  reviewText: string;
  rating: number;
}): Promise<ReviewAnalysis> {
  const result = await triageGraph.invoke({ ...emptyState, ...params });
  return result.analysis!;
}

/** Full pipeline — used when an agent asks for an AI draft. */
export async function runReplyPipeline(params: {
  reviewText: string;
  rating: number;
  authorName: string;
  brandVoice: BrandVoice;
  analysis: ReviewAnalysis | null;
}) {
  const result = await replyGraph.invoke({ ...emptyState, ...params });
  return {
    analysis: result.analysis!,
    draft: result.draft!,
    findings: result.findings,
    revisionCount: result.revisionCount,
  };
}
