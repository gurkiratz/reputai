import { startOfWeek, format, subWeeks } from "date-fns";

export type InsightReview = {
  reviewedAt: Date;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  status: string;
  slaDueAt: Date | null;
  postedAt: Date | null;
};

/** Share of posted replies that were posted before the SLA due time. Null when nothing is posted yet. */
export function onTimeRate(reviews: InsightReview[]): number | null {
  const posted = reviews.filter((r) => r.postedAt && r.slaDueAt);
  if (posted.length === 0) return null;
  const onTime = posted.filter((r) => r.postedAt!.getTime() <= r.slaDueAt!.getTime()).length;
  return Math.round((onTime / posted.length) * 100);
}

export function overdueCount(reviews: InsightReview[], now = new Date()): number {
  return reviews.filter((r) => r.status !== "POSTED" && r.slaDueAt && r.slaDueAt.getTime() < now.getTime()).length;
}

export type WeekRow = { week: string; positive: number; neutral: number; negative: number };

/** Sentiment counts for each of the last `weeks` weeks (oldest first). */
export function weeklySentiment(reviews: InsightReview[], weeks = 6, now = new Date()): WeekRow[] {
  const starts = Array.from({ length: weeks }, (_, i) => startOfWeek(subWeeks(now, weeks - 1 - i), { weekStartsOn: 1 }));
  const rows = starts.map((s) => ({ week: `Week of ${format(s, "MMM d")}`, positive: 0, neutral: 0, negative: 0 }));
  for (const r of reviews) {
    if (!r.sentiment) continue;
    const t = r.reviewedAt.getTime();
    for (let i = starts.length - 1; i >= 0; i--) {
      if (t >= starts[i].getTime()) {
        if (i === starts.length - 1 || t < starts[i + 1].getTime()) {
          rows[i][r.sentiment.toLowerCase() as "positive" | "neutral" | "negative"] += 1;
        }
        break;
      }
    }
  }
  return rows;
}
