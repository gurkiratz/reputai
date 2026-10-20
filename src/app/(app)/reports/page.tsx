import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Grid } from "@astryxdesign/core/Grid";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StackItem } from "@astryxdesign/core/Stack";
import { Table, proportional } from "@astryxdesign/core/Table";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card variant="muted">
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {label}
        </Text>
        <Heading level={3} type="display-3">
          {value}
        </Heading>
        {sub && (
          <Text type="supporting" size="xsm">
            {sub}
          </Text>
        )}
      </VStack>
    </Card>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <HStack gap={3} align="center">
      <Text type="supporting" size="sm">
        {label}
      </Text>
      <StackItem size="fill">
        <ProgressBar label={label} value={count} max={max} isLabelHidden variant="accent" />
      </StackItem>
      <Text type="supporting" size="sm">
        {count}
      </Text>
    </HStack>
  );
}

interface LocationRow extends Record<string, unknown> {
  name: string;
  total: number;
  avgRating: string;
  percentAnswered: string;
  negative: number;
}

export default async function ReportsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const reviews = await prisma.review.findMany({
    where: { location: { organizationId } },
    include: {
      location: true,
      replies: { where: { postedAt: { not: null } }, orderBy: { postedAt: "asc" }, take: 1 },
    },
  });

  const total = reviews.length;
  const posted = reviews.filter((r) => r.status === "POSTED");
  const percentAnswered = total === 0 ? 0 : Math.round((posted.length / total) * 100);

  const responseTimesMs = posted
    .map((r) => {
      const postedAt = r.replies[0]?.postedAt;
      return postedAt ? postedAt.getTime() - r.reviewedAt.getTime() : null;
    })
    .filter((v): v is number => v !== null);
  const avgResponseHours =
    responseTimesMs.length === 0
      ? null
      : responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length / (1000 * 60 * 60);

  const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNTRIAGED: 0 };
  for (const r of reviews) {
    if (r.sentiment) sentimentCounts[r.sentiment] += 1;
    else sentimentCounts.UNTRIAGED += 1;
  }

  const topicCounts = new Map<string, number>();
  for (const r of reviews) {
    for (const t of r.topics) {
      topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
    }
  }
  const topTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTopicCount = topTopics[0]?.[1] ?? 0;

  const locations = await prisma.location.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
  const perLocation: LocationRow[] = locations.map((loc) => {
    const locReviews = reviews.filter((r) => r.locationId === loc.id);
    const locPosted = locReviews.filter((r) => r.status === "POSTED");
    const negative = locReviews.filter((r) => r.sentiment === "NEGATIVE").length;
    const avgRating =
      locReviews.length === 0
        ? null
        : locReviews.reduce((a, r) => a + r.rating, 0) / locReviews.length;
    return {
      name: loc.name,
      total: locReviews.length,
      avgRating: avgRating === null ? "—" : avgRating.toFixed(1),
      percentAnswered:
        locReviews.length === 0
          ? "0%"
          : `${Math.round((locPosted.length / locReviews.length) * 100)}%`,
      negative,
    };
  });

  const maxSentiment = Math.max(...Object.values(sentimentCounts), 1);

  return (
    <VStack gap={8} hAlign="stretch">
      <VStack gap={0.5}>
        <Heading level={1}>Reports</Heading>
        <Text type="supporting" size="sm">
          Response time, coverage, sentiment, and topics across all locations.
        </Text>
      </VStack>

      <Grid columns={{ minWidth: 200, max: 4 }} gap={4}>
        <StatTile label="Total reviews" value={String(total)} />
        <StatTile
          label="% answered"
          value={`${percentAnswered}%`}
          sub={`${posted.length} of ${total} posted`}
        />
        <StatTile
          label="Avg. response time"
          value={avgResponseHours === null ? "—" : `${avgResponseHours.toFixed(1)}h`}
        />
        <StatTile label="Negative reviews" value={String(sentimentCounts.NEGATIVE)} />
      </Grid>

      <Card>
        <VStack gap={4} hAlign="stretch">
          <Text type="body" weight="semibold" size="sm">
            Sentiment
          </Text>
          <VStack gap={2} hAlign="stretch">
            <BarRow label="Positive" count={sentimentCounts.POSITIVE} max={maxSentiment} />
            <BarRow label="Neutral" count={sentimentCounts.NEUTRAL} max={maxSentiment} />
            <BarRow label="Negative" count={sentimentCounts.NEGATIVE} max={maxSentiment} />
            <BarRow label="Untriaged" count={sentimentCounts.UNTRIAGED} max={maxSentiment} />
          </VStack>
        </VStack>
      </Card>

      <Card>
        <VStack gap={4} hAlign="stretch">
          <Text type="body" weight="semibold" size="sm">
            Top topics
          </Text>
          {topTopics.length === 0 ? (
            <Text type="supporting" size="sm">
              No topics detected yet.
            </Text>
          ) : (
            <VStack gap={2} hAlign="stretch">
              {topTopics.map(([topic, count]) => (
                <BarRow key={topic} label={topic.replaceAll("_", " ")} count={count} max={maxTopicCount} />
              ))}
            </VStack>
          )}
        </VStack>
      </Card>

      <Card>
        <VStack gap={4} hAlign="stretch">
          <Text type="body" weight="semibold" size="sm">
            By location
          </Text>
          <Table
            data={perLocation}
            idKey="name"
            hasHover
            columns={[
              { key: "name", header: "Location", width: proportional(2) },
              { key: "total", header: "Reviews", width: proportional(1) },
              { key: "avgRating", header: "Avg rating", width: proportional(1) },
              { key: "percentAnswered", header: "% answered", width: proportional(1) },
              { key: "negative", header: "Negative", width: proportional(1) },
            ]}
          />
        </VStack>
      </Card>
    </VStack>
  );
}
