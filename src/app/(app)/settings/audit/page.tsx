import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Table, proportional } from "@astryxdesign/core/Table";
import { dateTimeLabel } from "@/lib/format";

interface AuditRow extends Record<string, unknown> {
  id: string;
  when: string;
  action: string;
  actor: string;
  details: string;
}

const ACTION_LABELS: Record<string, string> = {
  GOOGLE_CONNECTED: "Google connected",
  GOOGLE_DISCONNECTED: "Google disconnected",
  REPLY_APPROVED: "Reply approved",
  REPLY_POSTED: "Reply posted",
  WARN_OVERRIDE: "WARN override",
  SYNC_ERROR: "Sync error",
  SLA_ALERT: "SLA alert",
  FLAGGED_EXPORT: "Flagged export",
};

function describe(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  return Object.entries(details as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

export default async function AuditLogPage() {
  const session = await auth();
  if (session!.user.role !== "MANAGER") redirect("/dashboard");
  const organizationId = session!.user.organizationId;

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.user.findMany({ where: { organizationId }, select: { id: true, name: true } }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.name]));

  const rows: AuditRow[] = logs.map((l) => ({
    id: l.id,
    when: dateTimeLabel(l.createdAt),
    action: ACTION_LABELS[l.action] ?? l.action,
    actor: l.actorId ? (names.get(l.actorId) ?? "Unknown user") : "System job",
    details: describe(l.details),
  }));

  return (
    <VStack gap={5} hAlign="stretch">
      <VStack gap={0.5}>
        <Heading level={1}>Audit log</Heading>
        <Text type="supporting" size="sm">
          Google connections, approvals, overrides, posts, sync errors, SLA alerts and exports. Latest 200 entries.
        </Text>
      </VStack>
      {rows.length === 0 ? (
        <EmptyState title="No audit entries yet" description="Entries appear when a manager approves a reply or a job runs." />
      ) : (
        <Table
          data={rows}
          idKey="id"
          columns={[
            { key: "when", header: "When", width: proportional(1.3) },
            { key: "action", header: "Action", width: proportional(1) },
            { key: "actor", header: "By", width: proportional(1) },
            { key: "details", header: "Details", width: proportional(2.5) },
          ]}
        />
      )}
    </VStack>
  );
}
