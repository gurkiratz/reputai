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

const STEPS = [
  { n: "1", title: "Sync", body: "ReputAI pulls new Google reviews for every location every 15 minutes." },
  { n: "2", title: "Triage", body: "AI sets sentiment, topics and escalation. Urgent reviews go to the top with a reply due time." },
  { n: "3", title: "Draft and check", body: "AI drafts an on-brand reply. Safety rules check it and the draft is revised up to two times." },
  { n: "4", title: "Approve and post", body: "A manager approves the reply. ReputAI posts it to Google and records it in the audit log." },
];

const TRUST = [
  "Replies never mention a patient's treatment or health details. The rule check blocks them.",
  "Nothing is posted without a manager's approval. Every override has a reason in the audit log.",
  "Google tokens are encrypted. Each dental group sees only its own data.",
  "Overdue reviews create an in-app alert and an email, so no review is forgotten.",
];

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
    title: "Insights that drive action",
    body: "Response time, on-time replies, sentiment trend and repeated complaints by location — so a clinic can fix the problem, not just answer the review.",
  },
  {
    title: "SLA alerts",
    body: "An hourly check finds reviews past their reply due time and alerts the managers in the app and by email.",
  },
  {
    title: "Flagged review export",
    body: "Export flagged reviews as CSV to hand them to your privacy officer, legal team or clinic lead.",
  },
  {
    title: "Audit log",
    body: "Google connections, approvals, overrides, posts and sync errors are all recorded.",
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
              heading="ReputAI"
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
              ReputAI is a review operations platform for dental groups. It pulls in your Google
              reviews, drafts on-brand replies, blocks anything that breaks dental-privacy rules,
              keeps a manager in the loop, and shows how every location is doing.
            </Text>
            <Button as={NextLink} href="/login" label="Sign in to the demo" variant="primary" size="lg" />
          </VStack>
        </Center>

        <VStack gap={4} padding={10} hAlign="stretch">
          <Heading level={2} justify="center">
            How it works
          </Heading>
          <Grid columns={{ minWidth: 220, max: 4 }} gap={4}>
            {STEPS.map((s) => (
              <Card key={s.n}>
                <VStack gap={2}>
                  <Text type="label" color="accent">
                    Step {s.n}
                  </Text>
                  <Text type="body" weight="semibold">
                    {s.title}
                  </Text>
                  <Text type="supporting">{s.body}</Text>
                </VStack>
              </Card>
            ))}
          </Grid>
        </VStack>

        <VStack gap={6} padding={10} hAlign="stretch">
          <Heading level={2} justify="center">
            Features
          </Heading>
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
          <VStack gap={3} hAlign="stretch" maxWidth={720} padding={10}>
            <Heading level={2} justify="center">
              Safe by design
            </Heading>
            {TRUST.map((t) => (
              <Card key={t} variant="muted">
                <Text type="supporting">{t}</Text>
              </Card>
            ))}
            <Center axis="horizontal">
              <Button as={NextLink} href="/login" label="Try the demo" variant="primary" />
            </Center>
          </VStack>
        </Center>

        <Center axis="horizontal">
          <VStack paddingBlock={4}>
            <Text type="supporting" size="xsm">
              ReputAI · Group 5 · CPAN 324. Demo data: Bright Smile Dental Group.
            </Text>
          </VStack>
        </Center>
      </VStack>
    </AppShell>
  );
}
