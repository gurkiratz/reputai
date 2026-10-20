"use client";

import { useActionState, useState } from "react";
import { VStack } from "@astryxdesign/core/VStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { authenticate } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);
  const [email, setEmail] = useState("manager@brightsmile.example");
  const [password, setPassword] = useState("password123");

  return (
    <form action={formAction}>
      <VStack gap={4} hAlign="stretch">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {errorMessage && <Banner status="error" title={errorMessage} container="card" />}

        <TextInput
          label="Email"
          htmlName="email"
          type="email"
          value={email}
          onChange={setEmail}
          isRequired
        />
        <TextInput
          label="Password"
          htmlName="password"
          type="password"
          value={password}
          onChange={setPassword}
          isRequired
        />

        <Button
          type="submit"
          label={isPending ? "Signing in..." : "Sign in"}
          variant="primary"
          isLoading={isPending}
          width="100%"
        />
      </VStack>
    </form>
  );
}
