"use client";

import { useState, useTransition } from "react";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { createLocationAction } from "./actions";

export function AddLocationForm() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await createLocationAction(formData);
          setName("");
          setAddress("");
        });
      }}
    >
      <Card>
        <VStack gap={3} hAlign="stretch">
          <Text type="body" weight="semibold" size="sm">
            Add a location
          </Text>
          <HStack gap={3} wrap="wrap">
            <TextInput label="Location name" htmlName="name" value={name} onChange={setName} isRequired />
            <TextInput
              label="Address"
              htmlName="address"
              value={address}
              onChange={setAddress}
              isOptional
            />
          </HStack>
          <Button type="submit" label="Add location" variant="primary" isLoading={isPending} />
        </VStack>
      </Card>
    </form>
  );
}
