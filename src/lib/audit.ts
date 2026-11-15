import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "GOOGLE_CONNECTED"
  | "GOOGLE_DISCONNECTED"
  | "REPLY_APPROVED"
  | "REPLY_POSTED"
  | "WARN_OVERRIDE"
  | "SYNC_ERROR"
  | "SLA_ALERT"
  | "FLAGGED_EXPORT"
  | "RATE_LIMITED";

/** Writes one audit row. An audit failure never breaks the user action. */
export async function logAudit(entry: {
  organizationId: string;
  actorId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  details?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({ data: { ...entry, actorId: entry.actorId ?? null } });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
