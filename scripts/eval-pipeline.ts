/**
 * Runs the 30-review dental test set (tests/fixtures/dental-30.json) through
 * the real LangGraph pipeline and the real model. It checks:
 *  1. Triage: sentiment and escalation level against the expected labels.
 *  2. Safety: no final draft may keep a BLOCK flag except after the revise limit
 *     (then it cannot be posted), and no final draft may mention health details.
 * Writes docs/pipeline-eval.md. Run: npx tsx --env-file=.env scripts/eval-pipeline.ts
 */
import fs from "node:fs";
import path from "node:path";
import { runReplyPipeline } from "../src/lib/pipeline/graph";
import { runComplianceRules } from "../src/lib/compliance";

type Case = { id: string; rating: number; text: string; expect: { sentiment: string; escalation: string } };

const cases: Case[] = JSON.parse(fs.readFileSync(path.join(__dirname, "../tests/fixtures/dental-30.json"), "utf-8"));
const brandVoice = {
  tone: "warm, professional, concise, and reassuring — never defensive",
  talkingPoints: ["thank the reviewer by name", "invite them to call the clinic directly for anything unresolved"],
  topicsToAvoid: ["pricing specifics", "insurance claim details"],
  signOff: "— The Bright Smile Dental Team",
};

async function main() {
  const rows: string[] = [];
  let sentimentOk = 0;
  let escalationOk = 0;
  let safe = 0;
  let revised = 0;
  for (const c of cases) {
    const started = Date.now();
    const r = await runReplyPipeline({ reviewText: c.text, rating: c.rating, authorName: "Alex", brandVoice, analysis: null });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const finalBlocks = runComplianceRules(r.draft.body, brandVoice).filter((f) => f.severity === "BLOCK");
    const blocked = r.findings.some((f) => f.severity === "BLOCK");
    const isSafe = finalBlocks.length === 0;
    if (r.analysis.sentiment === c.expect.sentiment) sentimentOk++;
    if (r.analysis.escalationLevel === c.expect.escalation) escalationOk++;
    if (isSafe) safe++;
    if (r.revisionCount > 0) revised++;
    const warns = r.findings.filter((f) => f.severity === "WARN").map((f) => f.rule).join(", ") || "none";
    rows.push(
      `| ${c.id} | ${c.rating} | ${r.analysis.sentiment}${r.analysis.sentiment === c.expect.sentiment ? "" : ` (exp. ${c.expect.sentiment})`} | ${r.analysis.escalationLevel}${r.analysis.escalationLevel === c.expect.escalation ? "" : ` (exp. ${c.expect.escalation})`} | ${r.revisionCount} | ${blocked ? "BLOCK" : warns} | ${isSafe ? "Yes" : "No"} | ${seconds}s |`,
    );
    console.log(`${c.id} sentiment=${r.analysis.sentiment} escalation=${r.analysis.escalationLevel} revisions=${r.revisionCount} safe=${isSafe} ${seconds}s`);
  }
  const n = cases.length;
  const md = `# Pipeline Evaluation: 30-Review Dental Test Set

Run on ${new Date().toISOString().slice(0, 10)} with model \`${process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4o-mini"}\`.
Script: \`scripts/eval-pipeline.ts\`. Test set: \`tests/fixtures/dental-30.json\`.

| Result | Value |
| --- | --- |
| Sentiment matches expected label | ${sentimentOk} / ${n} (${Math.round((sentimentOk / n) * 100)}%) |
| Escalation matches expected label | ${escalationOk} / ${n} (${Math.round((escalationOk / n) * 100)}%) |
| Final drafts with no BLOCK rule (safe to submit) | ${safe} / ${n} |
| Drafts that needed the revise loop | ${revised} / ${n} |

Escalation labels are a judgement call (for example MANAGER or NORMAL for a single complaint). A mismatch does not mean an unsafe reply, because the rule check and the manager approval still run on every draft.

| ID | Stars | Sentiment | Escalation | Revisions | Flags | Safe | Time |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
  fs.mkdirSync(path.join(__dirname, "../docs"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "../docs/pipeline-eval.md"), md);
  console.log(`\nsentiment ${sentimentOk}/${n}, escalation ${escalationOk}/${n}, safe ${safe}/${n}, revised ${revised}/${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
