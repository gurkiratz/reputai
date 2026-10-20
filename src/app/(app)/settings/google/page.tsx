import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccessToken } from "@/lib/google/oauth";
import { listLocations } from "@/lib/google/client";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { formatDistanceToNow } from "date-fns";
import { disconnectGoogleAction, linkLocationAction } from "./actions";

const ERRORS: Record<string, string> = {
  manager_only: "Only a manager can connect a Google account.",
  access_denied: "Google access was not granted.",
  invalid_state: "The sign-in link expired. Try again.",
  token_exchange: "Google did not accept the sign-in. Check the OAuth client settings and try again.",
};

export default async function GoogleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { error, connected } = await searchParams;
  const session = await auth();
  const orgId = session!.user.organizationId;
  const isManager = session!.user.role === "MANAGER";
  const provider = process.env.REVIEW_PROVIDER === "google" ? "google" : "mock";

  const [connection, locations] = await Promise.all([
    prisma.googleConnection.findUnique({ where: { organizationId: orgId } }),
    prisma.location.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
  ]);

  // Load the GBP locations so each ReputAI location can be linked to one.
  let gbpLocations: { name: string; title: string; address: string | null }[] = [];
  let gbpError: string | null = null;
  if (connection?.accountName) {
    try {
      gbpLocations = await listLocations(await getAccessToken(orgId), connection.accountName);
    } catch (err) {
      gbpError = err instanceof Error ? err.message : "Could not load Google locations.";
    }
  }

  return (
    <VStack gap={6} hAlign="stretch">
      <VStack gap={0.5}>
        <Heading level={1}>Google Business Profile</Heading>
        <Text type="supporting" size="sm">
          Connect your Google account to sync real reviews and post approved replies. Review source now:{" "}
          <strong>{provider === "google" ? "Google Business Profile" : "Mock provider (sample reviews)"}</strong>.
          Set REVIEW_PROVIDER in .env to change it.
        </Text>
      </VStack>

      {error && <Banner status="error" title={ERRORS[error] ?? "Something went wrong."} />}
      {connected && <Banner status="success" title="Google account connected." isDismissable />}

      <Card>
        <VStack gap={3} hAlign="stretch">
          <Text weight="semibold">Connection</Text>
          {connection ? (
            <>
              <Text size="sm">
                Connected as {connection.googleAccountEmail ?? "unknown account"} (
                {connection.accountName ?? "no Business Profile account found"}).
              </Text>
              <Text size="sm" type="supporting">
                Last sync:{" "}
                {connection.lastSyncAt
                  ? formatDistanceToNow(connection.lastSyncAt, { addSuffix: true })
                  : "never"}
              </Text>
              {connection.lastSyncError && (
                <Banner status="error" title="Last sync failed" description={connection.lastSyncError} />
              )}
              {isManager && (
                <form action={disconnectGoogleAction}>
                  <Button type="submit" label="Disconnect" variant="secondary" size="sm" />
                </form>
              )}
            </>
          ) : (
            <>
              <Text size="sm">No Google account is connected.</Text>
              {isManager ? (
                <a href="/api/google/connect">
                  <Button label="Connect Google account" variant="primary" size="sm" />
                </a>
              ) : (
                <Text size="sm" type="supporting">Ask a manager to connect the Google account.</Text>
              )}
            </>
          )}
        </VStack>
      </Card>

      {connection && (
        <Card>
          <VStack gap={3} hAlign="stretch">
            <Text weight="semibold">Linked locations</Text>
            {gbpError && <Banner status="error" title="Could not load Google locations" description={gbpError} />}
            {locations.map((loc) => (
              <form key={loc.id} action={linkLocationAction}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <input type="hidden" name="locationId" value={loc.id} />
                  <Text size="sm" weight="semibold">{loc.name}</Text>
                  <select name="googleLocationName" defaultValue={loc.googleLocationName ?? ""} disabled={!isManager}>
                    <option value="">Not linked</option>
                    {gbpLocations.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.title}
                        {g.address ? ` — ${g.address}` : ""}
                      </option>
                    ))}
                  </select>
                  {isManager && <Button type="submit" label="Save" variant="secondary" size="sm" />}
                </HStack>
              </form>
            ))}
          </VStack>
        </Card>
      )}
    </VStack>
  );
}
