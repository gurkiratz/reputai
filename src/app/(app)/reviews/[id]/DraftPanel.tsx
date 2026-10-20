"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComplianceFlag, ComplianceSeverity } from "@prisma/client";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Icon } from "@astryxdesign/core/Icon";
import { dateTimeLabel } from "@/lib/format";
import {
  generateDraftAction,
  applyTemplateAction,
  saveDraftAction,
  submitForApprovalAction,
  sendBackAction,
  approveAndPostAction,
} from "./actions";

type ReplyWithFlags = {
  id: string;
  body: string;
  internalNote: string | null;
  isDraft: boolean;
  postedAt: Date | null;
  complianceFlags: ComplianceFlag[];
};

export function DraftPanel({
  reviewId,
  status,
  latestReply,
  templates,
  userRole,
}: {
  reviewId: string;
  status: "NEW" | "DRAFTED" | "AWAITING_APPROVAL" | "APPROVED" | "POSTED";
  latestReply: ReplyWithFlags | null;
  templates: { id: string; title: string }[];
  userRole: "AGENT" | "MANAGER";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState(latestReply?.body ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // `latestReply` is a server-provided prop that changes after router.refresh()
  // (e.g. right after generating a draft or applying a template) — resync the
  // local textarea value whenever the underlying reply changes, since useState's
  // initializer only runs once and won't pick up the new content on its own.
  useEffect(() => {
    setBody(latestReply?.body ?? "");
  }, [latestReply?.id, latestReply?.body]);

  const blockFlags = (latestReply?.complianceFlags ?? []).filter(
    (f) => f.severity === ("BLOCK" as ComplianceSeverity),
  );
  const warnFlags = (latestReply?.complianceFlags ?? []).filter(
    (f) => f.severity === ("WARN" as ComplianceSeverity),
  );

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const result = await action();
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }
  }

  const isPosted = status === "POSTED";
  const isAwaitingApproval = status === "AWAITING_APPROVAL";
  const canEdit = !isPosted && !isAwaitingApproval;

  return (
    <Card>
      <VStack gap={5} hAlign="stretch">
        <HStack justify="between" align="center" wrap="wrap" gap={2}>
          <Heading level={2}>Reply</Heading>
          {!latestReply && (
            <HStack gap={2} align="center">
              {templates.length > 0 && (
                <>
                  <Selector
                    label="Template"
                    isLabelHidden
                    placeholder="Use a template..."
                    options={templates.map((t) => ({ value: t.id, label: t.title }))}
                    value={selectedTemplate}
                    onChange={(v) => setSelectedTemplate(v)}
                    size="sm"
                  />
                  <Button
                    label="Apply"
                    variant="secondary"
                    size="sm"
                    isDisabled={!selectedTemplate}
                    clickAction={() => run(() => applyTemplateAction(reviewId, selectedTemplate))}
                  />
                </>
              )}
              <Button
                label="Generate AI draft"
                variant="primary"
                size="sm"
                clickAction={() => run(() => generateDraftAction(reviewId))}
              />
            </HStack>
          )}
        </HStack>

        {error && <Banner status="error" title={error} container="card" />}

        {!latestReply && (
          <Text type="supporting" size="sm">
            No draft yet. Generate one with AI or start from a template.
          </Text>
        )}

        {latestReply && (
          <>
            <TextArea
              label="Reply body"
              isLabelHidden
              value={body}
              onChange={setBody}
              isDisabled={!canEdit}
              rows={5}
            />

            {latestReply.internalNote && (
              <HStack gap={2} align="start">
                <Icon icon="info" color="secondary" size="sm" />
                <Text type="supporting" size="sm">
                  {latestReply.internalNote}
                  <Text as="span" type="supporting" size="xsm">
                    {" "}
                    · staff only, not shown to the reviewer
                  </Text>
                </Text>
              </HStack>
            )}

            {blockFlags.map((f) => (
              <Banner
                key={f.id}
                status="error"
                title={`Blocked — ${f.rule}`}
                description={f.message}
                container="card"
              />
            ))}
            {warnFlags.map((f) => (
              <Banner
                key={f.id}
                status="warning"
                title={`Warning — ${f.rule}`}
                description={f.message}
                container="card"
              />
            ))}

            <HStack gap={3} wrap="wrap" align="center">
              {canEdit && (
                <Button
                  label="Save changes"
                  variant="secondary"
                  size="sm"
                  isDisabled={body === latestReply.body}
                  clickAction={() => run(() => saveDraftAction(reviewId, latestReply.id, body))}
                />
              )}

              {status === "DRAFTED" && (
                <Button
                  label="Submit for approval"
                  variant="primary"
                  size="sm"
                  isDisabled={blockFlags.length > 0}
                  tooltip={
                    blockFlags.length > 0
                      ? "Resolve the blocked compliance issue first."
                      : undefined
                  }
                  clickAction={() => run(() => submitForApprovalAction(reviewId))}
                />
              )}

              {isAwaitingApproval && userRole === "MANAGER" && (
                <>
                  <Button
                    label="Approve & post to Google"
                    variant="primary"
                    size="sm"
                    isDisabled={blockFlags.length > 0}
                    clickAction={() => run(() => approveAndPostAction(reviewId))}
                  />
                  <Button
                    label="Send back to draft"
                    variant="secondary"
                    size="sm"
                    clickAction={() => run(() => sendBackAction(reviewId))}
                  />
                </>
              )}

              {isAwaitingApproval && userRole === "AGENT" && (
                <Text type="supporting" size="sm">
                  Awaiting manager approval.
                </Text>
              )}

              {isPosted && (
                <Text type="supporting" size="sm" color="accent">
                  Posted to Google
                  {latestReply.postedAt ? ` on ${dateTimeLabel(latestReply.postedAt)}` : ""}.
                </Text>
              )}
            </HStack>
          </>
        )}
      </VStack>
    </Card>
  );
}
