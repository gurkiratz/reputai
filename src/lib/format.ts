import { formatDistanceToNow, formatDistanceStrict, format } from "date-fns";

export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// date-fns' `format` always renders in a fixed (English) locale regardless of
// the runtime's system locale, unlike `Date#toLocaleString()` — which can
// legitimately differ between the Node server and the browser and trigger a
// hydration mismatch when used directly inside render output.
export function dateTimeLabel(date: Date): string {
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

export function slaLabel(slaDueAt: Date | null): { label: string; overdue: boolean } | null {
  if (!slaDueAt) return null;
  const overdue = slaDueAt.getTime() < Date.now();
  const distance = formatDistanceStrict(slaDueAt, new Date(), { addSuffix: false });
  return {
    label: overdue ? `${distance} overdue` : `due in ${distance}`,
    overdue,
  };
}

export function responseTimeLabel(reviewedAt: Date, postedAt: Date): string {
  return formatDistanceStrict(reviewedAt, postedAt);
}
