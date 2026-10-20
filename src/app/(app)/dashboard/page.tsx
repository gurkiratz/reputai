import type { Prisma, ReviewStatus, Sentiment } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Badge } from "@astryxdesign/core/Badge";
import { StatusBadge, SentimentBadge, EscalationBadge, Stars } from "@/components/badges";
import { timeAgo, slaLabel } from "@/lib/format";
import { FilterBar } from "./FilterBar";
import { SyncButton } from "./SyncButton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; status?: string; sentiment?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const organizationId = session!.user.organizationId;

  const locations = await prisma.location.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const where: Prisma.ReviewWhereInput = {
    location: { organizationId },
    ...(params.location ? { locationId: params.location } : {}),
    ...(params.status ? { status: params.status as ReviewStatus } : {}),
    ...(params.sentiment ? { sentiment: params.sentiment as Sentiment } : {}),
  };

  const reviews = await prisma.review.findMany({
    where,
    include: { location: true },
    orderBy: [{ priorityScore: "desc" }, { reviewedAt: "asc" }],
    take: 100,
  });

  const openCount = reviews.filter((r) => r.status !== "POSTED").length;

  return (
    <VStack gap={5} hAlign="stretch">
      <HStack justify="between" align="center" wrap="wrap" gap={3}>
        <VStack gap={0.5}>
          <Heading level={1}>Unified inbox</Heading>
          <Text type="supporting" size="sm">
            {reviews.length} review{reviews.length === 1 ? "" : "s"} shown · {openCount} open
          </Text>
        </VStack>
        <SyncButton />
      </HStack>

      <FilterBar locations={locations} />

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews match these filters"
          description="Try syncing reviews, or clear the filters above."
        />
      ) : (
        <List hasDividers density="balanced">
          {reviews.map((review) => {
            const sla = slaLabel(review.slaDueAt);
            return (
              <ListItem
                key={review.id}
                href={`/reviews/${review.id}`}
                label={review.authorName}
                description={
                  <VStack gap={1}>
                    <HStack gap={2} align="center" wrap="wrap">
                      <Stars rating={review.rating} />
                      <Text type="supporting" size="xsm">
                        {review.location.name} · {timeAgo(review.reviewedAt)}
                      </Text>
                    </HStack>
                    <Text type="body" size="sm" maxLines={2}>
                      {review.text}
                    </Text>
                  </VStack>
                }
                endContent={
                  <VStack gap={1.5} hAlign="end">
                    <HStack gap={1.5}>
                      <StatusBadge status={review.status} />
                      <SentimentBadge sentiment={review.sentiment} />
                    </HStack>
                    <EscalationBadge level={review.escalationLevel} />
                    {sla && review.status !== "POSTED" && (
                      sla.overdue ? (
                        <Badge variant="error" label={sla.label} />
                      ) : (
                        <Text type="supporting" size="xsm">
                          {sla.label}
                        </Text>
                      )
                    )}
                  </VStack>
                }
              />
            );
          })}
        </List>
      )}
    </VStack>
  );
}
