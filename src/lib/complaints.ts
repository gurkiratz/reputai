export type ComplaintReview = {
  locationName: string;
  sentiment: string | null;
  topics: string[];
};

export type ComplaintGroup = { name: string; count: number };

export const MIN_GROUP_SIZE = 2;

export function groupComplaints(reviews: ComplaintReview[]): ComplaintGroup[] {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    if (r.sentiment !== "NEGATIVE") continue;
    for (const topic of r.topics) {
      const key = `${topic.replaceAll("_", " ")} at ${r.locationName}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_GROUP_SIZE)
    .map(([name, count]) => ({ name: name[0].toUpperCase() + name.slice(1), count }))
    .sort((a, b) => b.count - a.count);
}
