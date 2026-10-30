import { describe, expect, it } from "vitest";
import { runComplianceRules } from "../src/lib/compliance";

describe("Dental compliance rules", () => {
  it.todo(
    "warns about liability in the wording: Your root canal was our fault.",
  );
  it.each([
    "We completed your root canal.",
    "Your extraction went well.",
    "We found several cavities.",
    "You were diagnosed during your visit.",
    "Please collect your prescription.",
    "We reviewed your treatment.",
    "We discussed your procedure.",
    "Your test results are available.",
    "We discussed your medication.",
    "YOUR X-RAYS ARE READY.",
    "We discussed your gum disease.",
    "Your periodontal care was reviewed.",
    "We discussed your condition.",
    "We reviewed your health.",
    "Your STI results are available.",
  ])("blocks patient health details: %s", (body) => {
    expect(runComplianceRules(body)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "BLOCK",
          rule: "patient_health_detail",
        }),
      ]),
    );
  });

  it.each([
    "It was our fault.",
    "We were negligent.",
    "Our mistake caused the harm.",
  ])("warns about admitting liability: %s", (body) => {
    expect(runComplianceRules(body)).toEqual([
      expect.objectContaining({
        severity: "WARN",
        rule: "liability_admission",
      }),
    ]);
  });

  it.each([
    "We guarantee a perfect experience.",
    "This will never happen again.",
    "We promise you a perfect result.",
  ])("warns about strong promises: %s", (body) => {
    expect(runComplianceRules(body)).toEqual([
      expect.objectContaining({
        severity: "WARN",
        rule: "unkeepable_promise",
      }),
    ]);
  });

  it.each([
    "Thank you for your feedback. Please contact our office.",
    "Our team can help with your health insurance questions.",
    "",
  ])("returns no findings for this input: %s", (body) => {
    expect(runComplianceRules(body)).toEqual([]);
  });

  it("checks avoided topics regardless of capitalization", () => {
    const findings = runComplianceRules("Please ask about our DISCOUNT.", {
      topicsToAvoid: [" discount "],
    });

    expect(findings).toEqual([
      expect.objectContaining({
        severity: "WARN",
        rule: "off_brand_topic",
      }),
    ]);
  });

  it("ignores blank entries in avoided topics", () => {
    expect(
      runComplianceRules("Thank you for your feedback.", {
        topicsToAvoid: ["", "   "],
      }),
    ).toEqual([]);
  });

  it("works when the brand profile is null", () => {
    expect(runComplianceRules("Thank you for your feedback.", null)).toEqual(
      [],
    );
  });

  it("keeps the BLOCK finding when a reply also has warnings", () => {
    const findings = runComplianceRules(
      "Your root canal was completed. It was our fault. We guarantee a perfect result.",
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "BLOCK",
          rule: "patient_health_detail",
        }),
        expect.objectContaining({
          severity: "WARN",
          rule: "liability_admission",
        }),
        expect.objectContaining({
          severity: "WARN",
          rule: "unkeepable_promise",
        }),
      ]),
    );
  });

  it("returns consistent findings across repeated checks", () => {
    const body = "We discussed your treatment.";

    expect(runComplianceRules(body)).toEqual(runComplianceRules(body));
  });
});
