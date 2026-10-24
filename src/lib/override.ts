export const OVERRIDE_REASONS = [
  "Reviewed and acceptable",
  "Wording is general, not about a patient",
  "Manager approved the commitment",
  "Other (add a note)",
] as const;

export type OverrideInput = { reason: string; note?: string };

export function validateOverride(
  flags: { severity: string }[],
  override?: OverrideInput,
): OverrideInput | null {
  if (flags.some((f) => f.severity === "BLOCK")) {
    throw new Error("This reply is blocked by the compliance checker and cannot be approved.");
  }
  if (!flags.some((f) => f.severity === "WARN")) return null;
  if (!override || !(OVERRIDE_REASONS as readonly string[]).includes(override.reason)) {
    throw new Error("Pick a reason to approve a reply that has warnings.");
  }
  if (override.reason.startsWith("Other") && !override.note?.trim()) {
    throw new Error("Add a note when the reason is Other.");
  }
  return { reason: override.reason, note: override.note?.trim() || undefined };
}
