"use client";

import { useState, useTransition } from "react";
import { VStack } from "@astryxdesign/core/VStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Banner } from "@astryxdesign/core/Banner";
import { createTemplateAction } from "./actions";

export function TemplateForm() {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await createTemplateAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          setTitle("");
          setBody("");
        });
      }}
    >
      <Card>
        <VStack gap={3} hAlign="stretch">
          {error && <Banner status="error" title={error} container="card" />}
          <TextInput
            label="Template title"
            htmlName="title"
            value={title}
            onChange={setTitle}
            isRequired
          />
          <TextArea
            label="Template body"
            htmlName="body"
            value={body}
            onChange={setBody}
            rows={3}
            isRequired
            description="Use {{author_name}} and {{sign_off}} as placeholders."
          />
          <Button type="submit" label="Add template" variant="primary" isLoading={isPending} />
        </VStack>
      </Card>
    </form>
  );
}
