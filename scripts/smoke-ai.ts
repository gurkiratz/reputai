import { analyzeReview, generateDraftReply } from "../src/lib/ai";
import { runComplianceRules } from "../src/lib/compliance";

const brandVoice = {
  tone: "warm, professional, concise, and reassuring — never defensive",
  talkingPoints: ["thank the reviewer by name", "invite them to call the clinic directly"],
  topicsToAvoid: ["pricing specifics"],
  signOff: "— The Bright Smile Dental Team",
};

const cases = [
  {
    authorName: "J. Huang",
    rating: 1,
    text:
      "Unbelievable. The receptionist read my treatment plan and payment amount out loud in a full waiting room, including details about my root canal. I am considering contacting my lawyer about this.",
  },
  {
    authorName: "Priya Nathan",
    rating: 5,
    text:
      "Dr. Okafor and the whole team were amazing. The office is spotless and the hygienist was so gentle with my cleaning. Booking online was easy too.",
  },
];

async function main() {
  for (const c of cases) {
    console.log("\n=== Review by", c.authorName, `(${c.rating}/5)`, "===");
    console.log(c.text);

    const analysis = await analyzeReview({ reviewText: c.text, rating: c.rating });
    console.log("Analysis:", analysis);

    const draft = await generateDraftReply({
      reviewText: c.text,
      rating: c.rating,
      authorName: c.authorName,
      brandVoice,
      analysis,
    });
    console.log("Draft reply:", draft.body);
    console.log("Internal note:", draft.internalNote);

    const findings = runComplianceRules(draft.body, brandVoice);
    console.log("Rule-based compliance findings:", findings);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
