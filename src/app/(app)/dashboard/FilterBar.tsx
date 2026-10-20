"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "DRAFTED", label: "Drafted" },
  { value: "AWAITING_APPROVAL", label: "Awaiting approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "POSTED", label: "Posted" },
];

const SENTIMENT_OPTIONS = [
  { value: "", label: "All sentiment" },
  { value: "POSITIVE", label: "Positive" },
  { value: "NEUTRAL", label: "Neutral" },
  { value: "NEGATIVE", label: "Negative" },
];

export function FilterBar({ locations }: { locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const locationOptions = [{ value: "", label: "All locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))];

  return (
    <HStack gap={2} wrap="wrap">
      <Selector
        label="Location"
        isLabelHidden
        options={locationOptions}
        value={searchParams.get("location") ?? ""}
        onChange={(value) => setParam("location", value)}
        size="sm"
      />
      <Selector
        label="Status"
        isLabelHidden
        options={STATUS_OPTIONS}
        value={searchParams.get("status") ?? ""}
        onChange={(value) => setParam("status", value)}
        size="sm"
      />
      <Selector
        label="Sentiment"
        isLabelHidden
        options={SENTIMENT_OPTIONS}
        value={searchParams.get("sentiment") ?? ""}
        onChange={(value) => setParam("sentiment", value)}
        size="sm"
      />
    </HStack>
  );
}
