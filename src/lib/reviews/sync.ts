import { prisma } from "@/lib/prisma";
import { getReviewProvider } from "@/lib/reviews/provider";
import { computePriorityScore, type ReviewAnalysis } from "@/lib/ai";
import { runTriage } from "@/lib/pipeline/graph";

const SLA_HOURS: Record<ReviewAnalysis["escalationLevel"], number> = {
  PRIVACY_RISK: 4,
  LEGAL: 4,
  MANAGER: 24,
  NORMAL: 48,
  POSSIBLE_FAKE: 72,
};

export type SyncResult = {
  locationId: string;
  fetched: number;
  created: number;
  analyzed: number;
  analysisErrors: number;
};

/**
 * Pulls reviews from the configured provider (Google or mock),
 * upserts anything new, and runs AI triage (sentiment, topics, escalation,
 * priority, SLA due date) on newly-created reviews only — reviews already
 * in the inbox keep whatever triage/edits already happened to them.
 */
export async function syncLocation(locationId: string): Promise<SyncResult> {
  const location = await prisma.location.findUniqueOrThrow({
    where: { id: locationId },
  });

  const provider = getReviewProvider();
  let rawReviews;
  try {
    rawReviews = await provider.fetchReviews(location);
  } catch (err) {
    await recordSyncStatus(location.organizationId, err);
    throw err;
  }
  await recordSyncStatus(location.organizationId, null);

  let created = 0;
  let analyzed = 0;
  let analysisErrors = 0;

  for (const raw of rawReviews) {
    const existing = await prisma.review.findUnique({
      where: {
        locationId_externalId: {
          locationId: location.id,
          externalId: raw.externalId,
        },
      },
    });
    if (existing) continue;

    const review = await prisma.review.create({
      data: {
        locationId: location.id,
        externalId: raw.externalId,
        authorName: raw.authorName,
        rating: raw.rating,
        text: raw.text,
        reviewedAt: raw.reviewedAt,
      },
    });
    created += 1;

    try {
      const analysis = await runTriage({
        reviewText: review.text,
        rating: review.rating,
      });
      const priorityScore = computePriorityScore({
        rating: review.rating,
        sentiment: analysis.sentiment,
        escalationLevel: analysis.escalationLevel,
      });
      const slaHours = SLA_HOURS[analysis.escalationLevel];
      const slaDueAt = new Date(
        review.reviewedAt.getTime() + slaHours * 60 * 60 * 1000,
      );

      await prisma.review.update({
        where: { id: review.id },
        data: {
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          escalationLevel: analysis.escalationLevel,
          escalationReason: analysis.escalationReason,
          priorityScore,
          slaDueAt,
        },
      });
      analyzed += 1;
    } catch (err) {
      // Triage failing shouldn't block the sync — the review still lands
      // in the inbox as NEW and can be (re)triaged manually later.
      analysisErrors += 1;
      console.error(`AI triage failed for review ${review.id}:`, err);
    }
  }

  return {
    locationId: location.id,
    fetched: rawReviews.length,
    created,
    analyzed,
    analysisErrors,
  };
}

export async function syncOrganization(organizationId: string): Promise<SyncResult[]> {
  const locations = await prisma.location.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const results: SyncResult[] = [];
  for (const loc of locations) {
    results.push(await syncLocation(loc.id));
  }
  return results;
}

/** Keeps the Google settings page informed about the last sync result. */
async function recordSyncStatus(organizationId: string, err: unknown) {
  if (process.env.REVIEW_PROVIDER !== "google") return;
  await prisma.googleConnection.updateMany({
    where: { organizationId },
    data: err
      ? { lastSyncError: err instanceof Error ? err.message : String(err) }
      : { lastSyncAt: new Date(), lastSyncError: null },
  });
}
