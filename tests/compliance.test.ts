import { describe, expect, it } from "vitest";
import { runComplianceRules } from "@/lib/compliance";

const rules = (body: string, avoid: string[] = []) =>
  runComplianceRules(body, { topicsToAvoid: avoid }).map((f) => `${f.severity}:${f.rule}`);

describe("runComplianceRules", () => {
  it("passes a safe reply", () => {
    expect(rules("Thank you for your feedback. We hope to see you again.")).toEqual([]);
  });

  it("blocks patient health details", () => {
    expect(rules("We are sorry your root canal hurt.")).toEqual(["BLOCK:patient_health_detail"]);
    expect(rules("Your x-ray results were fine.")).toEqual(["BLOCK:patient_health_detail"]);
  });

  it("warns on liability admission", () => {
    expect(rules("It was our fault.")).toEqual(["WARN:liability_admission"]);
  });

  it("warns on unkeepable promise", () => {
    expect(rules("We guarantee this will never happen again.")).toEqual(["WARN:unkeepable_promise"]);
  });

  it("warns on a topic to avoid, ignoring case", () => {
    expect(rules("Our PRICING is fair.", ["pricing"])).toEqual(["WARN:off_brand_topic"]);
  });

  it("ignores empty topics to avoid", () => {
    expect(rules("Thank you.", ["  "])).toEqual([]);
  });
});
