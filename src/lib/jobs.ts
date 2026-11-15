import { prisma } from "@/lib/prisma";
import { syncOrganization } from "@/lib/reviews/sync";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

export type SlaCandidate = {
  id: string;
  status: string;
  slaDueAt: Date | null;
  hasAlert: boolean;
};

/** Pure rule: a review needs an SLA alert when it is not posted, is past its due time and has no alert yet. */
export function needsSlaAlert(r: SlaCandidate, now: Date): boolean {
  return r.status !== "POSTED" && r.slaDueAt !== null && r.slaDueAt.getTime() < now.getTime() && !r.hasAlert;
}

/** Scheduled sync (FR2): syncs every location of every organization. One failure does not stop the rest. */
export async function runScheduledSync() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let created = 0;
  let errors = 0;
  for (const org of orgs) {
    try {
      const results = await syncOrganization(org.id);
      created += results.reduce((s, r) => s + r.created, 0);
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[job:sync] org ${org.id} failed: ${message}`);
      await logAudit({ organizationId: org.id, action: "SYNC_ERROR", details: { message, source: "scheduled" } });
    }
  }
  console.log(`[job:sync] organizations=${orgs.length} created=${created} errors=${errors}`);
  return { organizations: orgs.length, created, errors };
}

/** SLA check (FR13): creates in-app alerts for overdue reviews and emails the managers once per review. */
export async function runSlaCheck(now = new Date()) {
  const reviews = await prisma.review.findMany({
    where: { status: { not: "POSTED" }, slaDueAt: { lt: now } },
    include: { location: true, alerts: { where: { type: "SLA_OVERDUE" }, select: { id: true } } },
  });
  const overdue = reviews.filter((r) =>
    needsSlaAlert({ id: r.id, status: r.status, slaDueAt: r.slaDueAt, hasAlert: r.alerts.length > 0 }, now),
  );

  const byOrg = new Map<string, typeof overdue>();
  for (const r of overdue) {
    const list = byOrg.get(r.location.organizationId) ?? [];
    list.push(r);
    byOrg.set(r.location.organizationId, list);
  }

  let emailed = 0;
  for (const [organizationId, list] of byOrg) {
    await prisma.alert.createMany({
      data: list.map((r) => ({
        organizationId,
        reviewId: r.id,
        type: "SLA_OVERDUE",
        message: `${r.rating}-star review by ${r.authorName} at ${r.location.name} is past its reply due time.`,
      })),
      skipDuplicates: true,
    });

    const managers = await prisma.user.findMany({
      where: { organizationId, role: "MANAGER" },
      select: { email: true },
    });
    // SLA_EMAIL_TO lets a demo or test account receive the email instead of the seeded managers.
    const to = process.env.SLA_EMAIL_TO
      ? process.env.SLA_EMAIL_TO.split(",").map((s) => s.trim())
      : managers.map((m) => m.email);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const lines = list.map((r) => `- ${r.authorName} (${r.rating}/5) at ${r.location.name}: ${appUrl}/reviews/${r.id}`);
    const sent = await sendEmail({
      to,
      subject: `ReputAI: ${list.length} review${list.length === 1 ? "" : "s"} past the reply due time`,
      text: `These reviews do not have a posted reply and are past their due time:\n\n${lines.join("\n")}\n\nOpen ReputAI to reply.`,
    });
    if (sent) {
      emailed += list.length;
      await prisma.alert.updateMany({
        where: { reviewId: { in: list.map((r) => r.id) }, type: "SLA_OVERDUE" },
        data: { emailedAt: new Date() },
      });
    }
    await logAudit({
      organizationId,
      action: "SLA_ALERT",
      details: { reviews: list.length, emailSent: sent },
    });
  }
  console.log(`[job:sla] newAlerts=${overdue.length} emailed=${emailed}`);
  return { newAlerts: overdue.length, emailed };
}
