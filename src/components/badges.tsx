"use client";

import type { EscalationLevel, ReviewStatus, Sentiment } from "@prisma/client";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { Star, StarOff } from "lucide-react";

const STATUS_META: Record<
  ReviewStatus,
  { variant: "success" | "warning" | "error" | "accent" | "neutral"; label: string }
> = {
  NEW: { variant: "neutral", label: "New" },
  DRAFTED: { variant: "accent", label: "Drafted" },
  AWAITING_APPROVAL: { variant: "warning", label: "Awaiting approval" },
  APPROVED: { variant: "accent", label: "Approved" },
  POSTED: { variant: "success", label: "Posted" },
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const meta = STATUS_META[status];
  return (
    <HStack gap={1} align="center">
      <StatusDot variant={meta.variant} label={meta.label} />
      <Text type="supporting" size="sm">
        {meta.label}
      </Text>
    </HStack>
  );
}

const SENTIMENT_META: Record<
  Sentiment,
  { variant: "success" | "warning" | "error" | "accent" | "neutral"; label: string }
> = {
  POSITIVE: { variant: "success", label: "Positive" },
  NEUTRAL: { variant: "neutral", label: "Neutral" },
  NEGATIVE: { variant: "error", label: "Negative" },
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  const meta = sentiment ? SENTIMENT_META[sentiment] : { variant: "neutral" as const, label: "Untriaged" };
  return (
    <HStack gap={1} align="center">
      <StatusDot variant={meta.variant} label={meta.label} />
      <Text type="supporting" size="sm">
        {meta.label}
      </Text>
    </HStack>
  );
}

const ESCALATION_META: Record<
  Exclude<EscalationLevel, "NORMAL">,
  { variant: "warning" | "error" | "purple"; label: string }
> = {
  MANAGER: { variant: "warning", label: "Needs manager" },
  LEGAL: { variant: "error", label: "Legal risk" },
  PRIVACY_RISK: { variant: "error", label: "Privacy risk" },
  POSSIBLE_FAKE: { variant: "purple", label: "Possible fake" },
};

export function EscalationBadge({ level }: { level: EscalationLevel }) {
  if (level === "NORMAL") return null;
  const meta = ESCALATION_META[level];
  return <Badge variant={meta.variant} label={meta.label} />;
}

export function TopicBadge({ topic }: { topic: string }) {
  return <Badge variant="neutral" label={topic.replaceAll("_", " ")} />;
}

export function Stars({ rating }: { rating: number }) {
  return (
    <HStack gap={0.5} align="center" as="span">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          icon={i < rating ? Star : StarOff}
          color={i < rating ? "accent" : "disabled"}
          size="xsm"
        />
      ))}
    </HStack>
  );
}
