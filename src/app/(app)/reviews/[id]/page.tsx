import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import {
  StatusBadge,
  SentimentBadge,
  EscalationBadge,
  TopicBadge,
  Stars,
} from "@/components/badges";
import { BackLink } from "@/components/BackLink";
import { timeAgo, slaLabel } from "@/lib/format";
import { DraftPanel } from "./DraftPanel";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const review = await prisma.review.findFirst({
    where: { id, location: { organizationId: session!.user.organizationId } },
    include: {
      location: true,
      replies: {
        orderBy: { createdAt: "desc" },
        include: { complianceFlags: true, draftedBy: true, approvedBy: true },
      },
    },
  });

  if (!review) notFound();

  const templates = await prisma.replyTemplate.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const latestReply = review.replies[0] ?? null;
  const olderReplies = review.replies.slice(1);
  const sla = slaLabel(review.slaDueAt);

  return (
    <VStack gap={8} hAlign="stretch">
      <BackLink href="/dashboard">← Back to inbox</BackLink>

      <VStack gap={4} hAlign="stretch">
        <HStack justify="between" align="start" wrap="wrap" gap={3}>
          <VStack gap={1}>
            <HStack gap={2} align="center" wrap="wrap">
              <Stars rating={review.rating} />
              <Text type="body" weight="semibold">
                {review.authorName}
              </Text>
            </HStack>
            <Text type="supporting" size="sm">
              {review.location.name} · {timeAgo(review.reviewedAt)}
            </Text>
          </VStack>
          <HStack gap={1.5} align="center">
            <StatusBadge status={review.status} />
            <SentimentBadge sentiment={review.sentiment} />
            <EscalationBadge level={review.escalationLevel} />
          </HStack>
        </HStack>

        <Text type="large">{review.text}</Text>

        <HStack justify="between" align="center" wrap="wrap" gap={2}>
          <HStack gap={1.5} wrap="wrap">
            {review.topics.map((t) => (
              <TopicBadge key={t} topic={t} />
            ))}
          </HStack>
          <HStack gap={3} align="center">
            <Text type="supporting" size="xsm">
              Priority score: {review.priorityScore}
            </Text>
            {sla &&
              review.status !== "POSTED" &&
              (sla.overdue ? (
                <Badge variant="error" label={sla.label} />
              ) : (
                <Text type="supporting" size="xsm">
                  {sla.label}
                </Text>
              ))}
          </HStack>
        </HStack>

        {review.escalationReason && (
          <HStack gap={2} align="start">
            <Icon icon="warning" color="warning" size="sm" />
            <Text type="supporting" size="sm">
              {review.escalationReason}
            </Text>
          </HStack>
        )}
      </VStack>

      <DraftPanel
        reviewId={review.id}
        status={review.status}
        latestReply={latestReply}
        templates={templates}
        userRole={session!.user.role}
      />

      {olderReplies.length > 0 && (
        <Collapsible
          defaultIsOpen={false}
          trigger={
            <Text type="body" weight="semibold" size="sm">
              Draft history ({olderReplies.length})
            </Text>
          }
        >
          <List hasDividers density="compact">
            {olderReplies.map((r) => (
              <ListItem
                key={r.id}
                label={`Drafted by ${r.draftedBy?.name ?? "unknown"}${
                  r.approvedBy ? `, approved by ${r.approvedBy.name}` : ""
                }`}
                description={r.body}
              />
            ))}
          </List>
        </Collapsible>
      )}
    </VStack>
  );
}
