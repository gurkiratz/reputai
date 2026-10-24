import { describe, expect, it } from "vitest";
import { groupComplaints } from "@/lib/complaints";

const r = (locationName: string, sentiment: string, topics: string[]) => ({ locationName, sentiment, topics });

describe("groupComplaints", () => {
  it("groups negative reviews by topic and location with a plain name", () => {
    const groups = groupComplaints([
      r("Main Street", "NEGATIVE", ["wait_time"]),
      r("Main Street", "NEGATIVE", ["wait_time", "billing"]),
      r("Main Street", "NEGATIVE", ["wait_time"]),
      r("Oak Avenue", "NEGATIVE", ["wait_time"]),
    ]);
    expect(groups).toEqual([{ name: "Wait time at Main Street", count: 3 }]);
  });

  it("ignores positive reviews and single complaints", () => {
    expect(
      groupComplaints([r("Main Street", "POSITIVE", ["billing"]), r("Main Street", "POSITIVE", ["billing"]), r("Main Street", "NEGATIVE", ["parking"])]),
    ).toEqual([]);
  });
});
