import { prisma } from "@/lib/prisma";

export type Bucket = { count: number; resetAt: Date };

/** Pure fixed-window step. Kept separate so it can be unit tested. */
export function nextBucket(current: Bucket | null, now: Date, windowMs: number): Bucket {
  if (!current || current.resetAt.getTime() <= now.getTime()) {
    return { count: 1, resetAt: new Date(now.getTime() + windowMs) };
  }
  return { count: current.count + 1, resetAt: current.resetAt };
}

export const LIMITS = {
  aiDraft: { limit: 20, windowMs: 60_000 }, // per user
  sync: { limit: 5, windowMs: 60_000 }, // per organization
  login: { limit: 10, windowMs: 15 * 60_000 }, // per email
  export: { limit: 10, windowMs: 60_000 }, // per user
} as const;

export class RateLimitError extends Error {
  constructor(retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitError";
  }
}

/** Throws RateLimitError when the key is over its limit in the current window. */
export async function enforceRateLimit(key: string, rule: { limit: number; windowMs: number }) {
  const now = new Date();
  const bucket = await prisma.$transaction(async (tx) => {
    const current = await tx.rateLimit.findUnique({ where: { key } });
    const next = nextBucket(current, now, rule.windowMs);
    await tx.rateLimit.upsert({
      where: { key },
      create: { key, ...next },
      update: next,
    });
    return next;
  });
  if (bucket.count > rule.limit) {
    throw new RateLimitError(Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000));
  }
}
