import { describe, expect, it } from "vitest";
import { OVERRIDE_REASONS, validateOverride } from "@/lib/override";

const warn = [{ severity: "WARN" }];

describe("validateOverride", () => {
  it("needs no override when there are no flags", () => {
    expect(validateOverride([])).toBeNull();
  });

  it("never allows a BLOCK flag, even with a reason", () => {
    expect(() => validateOverride([{ severity: "BLOCK" }], { reason: OVERRIDE_REASONS[0] })).toThrow(/blocked/);
  });

  it("needs a reason for WARN flags", () => {
    expect(() => validateOverride(warn)).toThrow(/reason/);
    expect(() => validateOverride(warn, { reason: "made up" })).toThrow(/reason/);
  });

  it("needs a note for the Other reason", () => {
    expect(() => validateOverride(warn, { reason: OVERRIDE_REASONS[3], note: " " })).toThrow(/note/);
  });

  it("accepts a listed reason", () => {
    expect(validateOverride(warn, { reason: OVERRIDE_REASONS[0], note: " ok " })).toEqual({
      reason: OVERRIDE_REASONS[0],
      note: "ok",
    });
  });
});
