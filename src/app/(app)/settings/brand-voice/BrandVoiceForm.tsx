"use client";

import { useState, useTransition } from "react";
import { VStack } from "@astryxdesign/core/VStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Banner } from "@astryxdesign/core/Banner";
import { Text } from "@astryxdesign/core/Text";
import { saveBrandVoiceAction } from "./actions";

export function BrandVoiceForm({
  initial,
  readOnly,
}: {
  initial: {
    tone: string;
    talkingPoints: string[];
    topicsToAvoid: string[];
    signOff: string | null;
  };
  readOnly: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tone, setTone] = useState(initial.tone);
  const [talkingPoints, setTalkingPoints] = useState(initial.talkingPoints.join("\n"));
  const [topicsToAvoid, setTopicsToAvoid] = useState(initial.topicsToAvoid.join("\n"));
  const [signOff, setSignOff] = useState(initial.signOff ?? "");

  return (
    <form
      action={(formData) => {
        setMessage(null);
        setError(null);
        startTransition(async () => {
          const result = await saveBrandVoiceAction(formData);
          if (result.ok) setMessage("Saved.");
          else setError(result.error);
        });
      }}
    >
      <Card>
        <VStack gap={4} hAlign="stretch">
          <TextInput
            label="Tone"
            htmlName="tone"
            value={tone}
            onChange={setTone}
            isDisabled={readOnly}
          />
          <TextArea
            label="Talking points (one per line)"
            htmlName="talkingPoints"
            value={talkingPoints}
            onChange={setTalkingPoints}
            rows={4}
            isDisabled={readOnly}
          />
          <TextArea
            label="Topics to avoid (one per line)"
            htmlName="topicsToAvoid"
            value={topicsToAvoid}
            onChange={setTopicsToAvoid}
            rows={3}
            isDisabled={readOnly}
          />
          <TextInput
            label="Sign-off"
            htmlName="signOff"
            value={signOff}
            onChange={setSignOff}
            isDisabled={readOnly}
          />

          {!readOnly && (
            <Button
              type="submit"
              label="Save brand voice"
              variant="primary"
              isLoading={isPending}
            />
          )}

          {message && <Banner status="success" title={message} container="card" />}
          {error && <Banner status="error" title={error} container="card" />}
          {readOnly && (
            <Text type="supporting" size="xsm">
              Only a manager can edit the brand voice profile.
            </Text>
          )}
        </VStack>
      </Card>
    </form>
  );
}
