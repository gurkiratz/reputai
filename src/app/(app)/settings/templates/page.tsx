import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Button } from "@astryxdesign/core/Button";
import { deleteTemplateAction } from "./actions";
import { TemplateForm } from "./TemplateForm";

export default async function TemplatesPage() {
  const session = await auth();
  const templates = await prisma.replyTemplate.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { title: "asc" },
  });

  return (
    <VStack gap={6} hAlign="stretch">
      <VStack gap={0.5}>
        <Heading level={1}>Reply templates</Heading>
        <Text type="supporting" size="sm">
          Saved starting points for common situations.
        </Text>
      </VStack>

      <TemplateForm />

      {templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Add one above to get started." />
      ) : (
        <List hasDividers density="balanced">
          {templates.map((t) => (
            <ListItem
              key={t.id}
              label={t.title}
              description={t.body}
              endContent={
                <form action={deleteTemplateAction.bind(null, t.id)}>
                  <Button type="submit" label="Delete" variant="ghost" size="sm" />
                </form>
              }
            />
          ))}
        </List>
      )}
    </VStack>
  );
}
