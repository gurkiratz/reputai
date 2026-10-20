import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { BrandVoiceForm } from "./BrandVoiceForm";

export default async function BrandVoicePage() {
  const session = await auth();
  const profile = await prisma.brandVoiceProfile.findUnique({
    where: { organizationId: session!.user.organizationId },
  });

  return (
    <VStack gap={4} hAlign="stretch">
      <VStack gap={0.5}>
        <Heading level={1}>Brand voice profile</Heading>
        <Text type="supporting" size="sm">
          Guides every AI-drafted reply for your organization — tone, talking points, and topics
          that must never be mentioned.
        </Text>
      </VStack>
      <BrandVoiceForm
        initial={{
          tone: profile?.tone ?? "",
          talkingPoints: profile?.talkingPoints ?? [],
          topicsToAvoid: profile?.topicsToAvoid ?? [],
          signOff: profile?.signOff ?? null,
        }}
        readOnly={session!.user.role !== "MANAGER"}
      />
    </VStack>
  );
}
