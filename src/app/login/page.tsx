import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/VStack";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";

  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <Center axis="both" height="100dvh" width="100%">
      <VStack gap={4} hAlign="stretch" maxWidth={400} width="100%">
        <Card padding={8} width="100%">
          <VStack gap={5} hAlign="stretch">
            <VStack gap={1} hAlign="start">
              <Heading level={1}>Review Ops Platform</Heading>
              <Text type="supporting" size="sm">
                Sign in to manage reviews for your dental group.
              </Text>
            </VStack>
            <LoginForm callbackUrl={callbackUrl} />
            <Text type="supporting" size="sm">
              Demo accounts: manager@brightsmile.example / agent@brightsmile.example
              (password: password123)
            </Text>
          </VStack>
        </Card>
      </VStack>
    </Center>
  );
}
