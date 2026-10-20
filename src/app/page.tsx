"use client";

import NextLink from "next/link";
import { AppShell } from "@astryxdesign/core/AppShell";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/VStack";
import { Grid } from "@astryxdesign/core/Grid";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Stethoscope } from "lucide-react";

const FEATURES = [
  {
    title: "Unified review inbox",
    body: "Every Google review from every clinic location, in one place, filterable by location, status, and sentiment.",
  },
  {
    title: "On-brand AI drafts",
    body: "Draft replies generated from your brand voice profile, ready for an agent to review in seconds instead of minutes.",
  },
  {
    title: "Dental-privacy compliance checker",
    body: "A rules layer blocks any reply that references a patient's treatment, diagnosis, or health details — before a manager ever sees it.",
  },
  {
    title: "Smart escalation & priority",
    body: "Reviews are ranked by real urgency, not star rating — a five-star review that reveals a privacy breach can outrank a routine two-star complaint.",
  },
  {
    title: "Human-in-the-loop approval",
    body: "Agents draft, managers approve. Nothing reaches Google without a person signing off.",
  },
  {
    title: "Reporting that drives action",
    body: "Response time, sentiment trend, and recurring topics by location — so a clinic can fix the problem, not just answer the review.",
  },
];

export default function Home() {
  return (
    <AppShell
      height="auto"
      contentPadding={0}
      topNav={
        <TopNav
          label="Marketing navigation"
          heading={
            <TopNavHeading
              heading="Review Ops Platform"
              logo={<NavIcon icon={<Icon icon={Stethoscope} size="sm" />} />}
            />
          }
          endContent={
            <Button as={NextLink} href="/login" label="Sign in" variant="primary" size="sm" />
          }
        />
      }
    >
      <VStack gap={0} hAlign="stretch">
        <Center axis="horizontal">
          <VStack gap={5} hAlign="center" maxWidth={640} padding={10}>
            <Text type="label" color="accent">
              Built for multi-location dental groups
            </Text>
            <Heading level={1} type="display-2" justify="center">
              Every review, triaged, drafted, and answered — without missing the ones that matter.
            </Heading>
            <Text type="large" color="secondary" justify="center">
              An AI review operations platform for dental service organizations: it pulls in your
              Google reviews, drafts on-brand replies, blocks anything that breaks dental-privacy
              rules, routes what needs a manager or legal review, and reports on how every location
              is doing.
            </Text>
            <Button as={NextLink} href="/login" label="Sign in to the demo" variant="primary" size="lg" />
          </VStack>
        </Center>

        <VStack gap={6} padding={10} hAlign="stretch">
          <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
            {FEATURES.map((f) => (
              <Card key={f.title} variant="muted">
                <VStack gap={2}>
                  <Text type="body" weight="semibold">
                    {f.title}
                  </Text>
                  <Text type="supporting">{f.body}</Text>
                </VStack>
              </Card>
            ))}
          </Grid>
        </VStack>

        <Center axis="horizontal">
          <VStack gap={2} hAlign="center" maxWidth={560} padding={10}>
            <Heading level={2} justify="center">
              Who it&apos;s for
            </Heading>
            <Text type="supporting" justify="center">
              Dental service organizations running several clinics under one brand, where reply
              quality and rating directly affect new patient bookings — and where a public reply
              must never discuss a patient&apos;s treatment or health details.
            </Text>
          </VStack>
        </Center>

        <Center axis="horizontal">
          <VStack paddingBlock={4}>
            <Text type="supporting" size="xsm">
              Phase 1 prototype — Bright Smile Dental Group demo data, mock Google Business
              Profile sync.
            </Text>
          </VStack>
        </Center>
      </VStack>
    </AppShell>
  );
}
