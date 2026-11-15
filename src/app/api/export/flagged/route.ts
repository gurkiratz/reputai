import { NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";
import { enforceRateLimit, LIMITS, RateLimitError } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** FR16: CSV export of flagged reviews for handoff to legal, privacy or the clinic lead. Managers only. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Only a manager can export flagged reviews." }, { status: 403 });
  }
  try {
    await enforceRateLimit(`export:${session.user.id}`, LIMITS.export);
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    throw err;
  }

  const organizationId = session.user.organizationId;
  const reviews = await prisma.review.findMany({
    where: {
      location: { organizationId },
      OR: [
        { escalationLevel: { not: "NORMAL" } },
        { replies: { some: { complianceFlags: { some: {} } } } },
      ],
    },
    include: {
      location: true,
      replies: { orderBy: { createdAt: "desc" }, take: 1, include: { complianceFlags: true } },
    },
    orderBy: [{ priorityScore: "desc" }, { reviewedAt: "asc" }],
  });

  const header = [
    "Review date", "Location", "Reviewer", "Rating", "Sentiment", "Escalation", "Escalation reason",
    "Status", "Reply due", "Compliance flags", "Review text", "Latest reply",
  ];
  const rows = reviews.map((r) => {
    const reply = r.replies[0];
    return [
      format(r.reviewedAt, "yyyy-MM-dd HH:mm"),
      r.location.name,
      r.authorName,
      r.rating,
      r.sentiment ?? "",
      r.escalationLevel,
      r.escalationReason ?? "",
      r.status,
      r.slaDueAt ? format(r.slaDueAt, "yyyy-MM-dd HH:mm") : "",
      reply?.complianceFlags.map((f) => `${f.severity}:${f.rule}`).join("; ") ?? "",
      r.text,
      reply?.body ?? "",
    ];
  });

  await logAudit({
    organizationId,
    actorId: session.user.id,
    action: "FLAGGED_EXPORT",
    details: { rows: rows.length },
  });

  return new NextResponse("﻿" + toCsv([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reputai-flagged-reviews-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
