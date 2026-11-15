import { timingSafeEqual } from "node:crypto";

/** Job routes accept only "Authorization: Bearer <CRON_SECRET>". */
export function isCronAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
