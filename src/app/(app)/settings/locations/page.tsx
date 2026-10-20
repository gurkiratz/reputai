import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { List, ListItem } from "@astryxdesign/core/List";
import { SyncLocationButton } from "./SyncLocationButton";
import { AddLocationForm } from "./AddLocationForm";

export default async function LocationsPage() {
  const session = await auth();
  const locations = await prisma.location.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { reviews: true } } },
  });

  return (
    <VStack gap={6} hAlign="stretch">
      <VStack gap={0.5}>
        <Heading level={1}>Locations</Heading>
        <Text type="supporting" size="sm">
          Each location syncs reviews from its linked Google Business Profile location. Connect
          Google and link locations in Settings → Google.
        </Text>
      </VStack>

      <List hasDividers density="balanced">
        {locations.map((loc) => (
          <ListItem
            key={loc.id}
            label={loc.name}
            description={`${loc.address ?? "No address set"} · ${loc._count.reviews} review${
              loc._count.reviews === 1 ? "" : "s"
            } synced`}
            endContent={<SyncLocationButton locationId={loc.id} />}
          />
        ))}
      </List>

      <AddLocationForm />
    </VStack>
  );
}
