export type ComplianceSeverity = "BLOCK" | "WARN";

export type ComplianceFinding = {
  severity: ComplianceSeverity;
  rule: string;
  message: string;
};

// These patterns are the hard, deterministic backstop for the dental
// privacy rule: a public reply must never discuss a patient's treatment
// or health details. This must not depend on the language model alone,
// so it runs as plain regex before (and regardless of) any AI check.
const PATIENT_HEALTH_DETAIL_PATTERNS: RegExp[] = [
  /root canal/i,
  /extraction/i,
  /cavit(y|ies)/i,
  /diagnos(is|ed|es)/i,
  /prescri(ption|bed)/i,
  /your treatment/i,
  /your procedure/i,
  /test results?/i,
  /medications?/i,
  /x-?rays?/i,
  /gum disease/i,
  /periodontal/i,
  /your condition/i,
  /your health(?! insurance)/i,
  /\bsti\b|\bstd\b/i,
];

const LIABILITY_ADMISSION_PATTERNS: RegExp[] = [
  /(it|this) was our fault/i,
  /we (are|were) (liable|negligent)/i,
  /we admit/i,
  /our (error|mistake) caused/i,
  /we (are|were) responsible for (the )?(damage|harm)/i,
];

const UNKEEPABLE_PROMISE_PATTERNS: RegExp[] = [
  /100% guarantee/i,
  /we guarantee/i,
  /will never happen again/i,
  /free (treatment|service) for life/i,
  /(i |we )?promise (you|this)/i,
];

export function runComplianceRules(
  replyBody: string,
  brandVoice?: { topicsToAvoid: string[] } | null,
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  const healthMatch = PATIENT_HEALTH_DETAIL_PATTERNS.find((p) =>
    p.test(replyBody),
  );
  if (healthMatch) {
    findings.push({
      severity: "BLOCK",
      rule: "patient_health_detail",
      message:
        "This reply appears to reference a patient's specific treatment, diagnosis, or health details. Public replies must never discuss a patient's care — this is a hard dental-privacy rule and cannot be approved as written.",
    });
  }

  const liabilityMatch = LIABILITY_ADMISSION_PATTERNS.find((p) =>
    p.test(replyBody),
  );
  if (liabilityMatch) {
    findings.push({
      severity: "WARN",
      rule: "liability_admission",
      message:
        "This reply may admit fault or legal liability on behalf of the business. Have a manager review before it goes out.",
    });
  }

  const promiseMatch = UNKEEPABLE_PROMISE_PATTERNS.find((p) =>
    p.test(replyBody),
  );
  if (promiseMatch) {
    findings.push({
      severity: "WARN",
      rule: "unkeepable_promise",
      message:
        "This reply makes a strong promise or guarantee the business may not be able to keep.",
    });
  }

  for (const topic of brandVoice?.topicsToAvoid ?? []) {
    const needle = topic.trim().toLowerCase();
    if (needle && replyBody.toLowerCase().includes(needle)) {
      findings.push({
        severity: "WARN",
        rule: "off_brand_topic",
        message: `This reply mentions "${topic}", which this brand's voice profile lists as a topic to avoid.`,
      });
    }
  }

  return findings;
}
