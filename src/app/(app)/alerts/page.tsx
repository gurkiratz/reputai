import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { timeAgo } from "@/lib/format";
import { markAlertReadAction, markAllAlertsReadAction } from "./actions";
import { RunSlaButton } from "./RunSlaButton";

export default async function AlertsPage() {
  const session = await auth();
  const { organizationId, role } = session!.user;

  const alerts = await prisma.alert.findMany({
    where: { organizationId },
    include: { review: { select: { status: true } } },
    orderBy: [{ readAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
  });
  const unread = alerts.filter((a) => !a.readAt).length;

  return (
    <VStack gap={5} hAlign="stretch">
      <HStack justify="between" align="center" wrap="wrap" gap={3}>
        <VStack gap={0.5}>
          <Heading level={1}>Alerts</Heading>
          <Text type="supporting" size="sm">
            Reviews that passed their reply due time. The SLA check runs every hour and also emails the managers.
          </Text>
        </VStack>
        <HStack gap={2}>
          {role === "MANAGER" && <RunSlaButton />}
          {unread > 0 && (
            <form action={markAllAlertsReadAction}>
              <Button type="submit" label="Mark all as read" variant="ghost" size="sm" />
            </form>
          )}
        </HStack>
      </HStack>

      {alerts.length === 0 ? (
        <EmptyState title="No alerts" description="All reviews are inside their reply due time." />
      ) : (
        <List hasDividers density="balanced">
          {alerts.map((a) => (
            <ListItem
              key={a.id}
              href={`/reviews/${a.reviewId}`}
              label={a.message}
              description={`${timeAgo(a.createdAt)}${a.emailedAt ? " · email sent" : ""}${
                a.review.status === "POSTED" ? " · reply posted" : ""
              }`}
              endContent={
                a.readAt ? (
                  <Text type="supporting" size="xsm">Read</Text>
                ) : (
                  <HStack gap={2} align="center">
                    <Badge variant="error" label="Overdue" />
                    <form action={markAlertReadAction.bind(null, a.id)}>
                      <Button type="submit" label="Mark read" variant="ghost" size="sm" />
                    </form>
                  </HStack>
                )
              }
            />
          ))}
        </List>
      )}
    </VStack>
  );
}
