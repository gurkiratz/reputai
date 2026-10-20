"use client";

import NextLink from "next/link";
import { Link } from "@astryxdesign/core/Link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link as={NextLink} href={href}>
      {children}
    </Link>
  );
}
