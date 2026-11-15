import { afterEach, describe, expect, it } from "vitest";
import { nextBucket } from "@/lib/rate-limit";
import { toCsv } from "@/lib/csv";
import { needsSlaAlert } from "@/lib/jobs";
import { onTimeRate, overdueCount, weeklySentiment } from "@/lib/insights";
import { isCronAuthorized } from "@/lib/cron-auth";
import { withRetry } from "@/lib/retry";

const now = new Date("2026-11-15T12:00:00Z");
const hours = (h: number) => new Date(now.getTime() + h * 3600_000);

describe("rate limit window", () => {
  it("starts a new window when there is no bucket", () => {
    expect(nextBucket(null, now, 60_000)).toEqual({ count: 1, resetAt: new Date(now.getTime() + 60_000) });
  });
  it("counts up inside the window and resets after it", () => {
    const b = { count: 4, resetAt: new Date(now.getTime() + 1000) };
    expect(nextBucket(b, now, 60_000).count).toBe(5);
    expect(nextBucket({ count: 99, resetAt: now }, now, 60_000).count).toBe(1);
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(toCsv([["a,b", 'say "hi"', "x\ny"]])).toBe('"a,b","say ""hi""","x\ny"');
  });
  it("stops formula injection from review text", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "@x", "-2", "ok"]])).toBe("'=HYPERLINK(1),'+1,'@x,'-2,ok");
  });
});

describe("SLA alert rule", () => {
  const base = { id: "r1", status: "NEW", slaDueAt: hours(-1), hasAlert: false };
  it("alerts an open overdue review once", () => {
    expect(needsSlaAlert(base, now)).toBe(true);
    expect(needsSlaAlert({ ...base, hasAlert: true }, now)).toBe(false);
  });
  it("skips posted, not yet due and untriaged reviews", () => {
    expect(needsSlaAlert({ ...base, status: "POSTED" }, now)).toBe(false);
    expect(needsSlaAlert({ ...base, slaDueAt: hours(2) }, now)).toBe(false);
    expect(needsSlaAlert({ ...base, slaDueAt: null }, now)).toBe(false);
  });
});

describe("insights", () => {
  const rows = [
    { reviewedAt: hours(-30), sentiment: "NEGATIVE" as const, status: "POSTED", slaDueAt: hours(-26), postedAt: hours(-28) },
    { reviewedAt: hours(-30), sentiment: "POSITIVE" as const, status: "POSTED", slaDueAt: hours(-26), postedAt: hours(-20) },
    { reviewedAt: hours(-10), sentiment: "NEUTRAL" as const, status: "NEW", slaDueAt: hours(-1), postedAt: null },
    { reviewedAt: hours(-1), sentiment: null, status: "NEW", slaDueAt: hours(3), postedAt: null },
  ];
  it("computes on-time rate and overdue count", () => {
    expect(onTimeRate(rows)).toBe(50);
    expect(onTimeRate([])).toBeNull();
    expect(overdueCount(rows, now)).toBe(1);
  });
  it("groups sentiment by week and skips untriaged reviews", () => {
    const weeks = weeklySentiment(rows, 2, now);
    expect(weeks).toHaveLength(2);
    const total = weeks.reduce((s, w) => s + w.positive + w.neutral + w.negative, 0);
    expect(total).toBe(3);
  });
});

describe("cron route auth", () => {
  const old = process.env.CRON_SECRET;
  afterEach(() => {
    process.env.CRON_SECRET = old;
  });
  it("accepts only the exact bearer secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronAuthorized("Bearer s3cret")).toBe(true);
    expect(isCronAuthorized("Bearer wrong")).toBe(false);
    expect(isCronAuthorized(null)).toBe(false);
  });
  it("rejects every request when no secret is set", () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized("Bearer ")).toBe(false);
  });
});

describe("retry", () => {
  it("retries up to 3 times, then throws", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw new Error("fail");
      }, 3, 1),
    ).rejects.toThrow("fail");
    expect(calls).toBe(3);
  });
  it("returns when a retry succeeds", async () => {
    let calls = 0;
    const v = await withRetry(async () => {
      calls += 1;
      if (calls < 2) throw new Error("once");
      return "ok";
    }, 3, 1);
    expect(v).toBe("ok");
  });
});
