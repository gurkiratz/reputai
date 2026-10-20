import fs from "node:fs";
import path from "node:path";
import { getAccessToken } from "@/lib/google/oauth";
import { listReviews, updateReply, STAR_TO_NUMBER } from "@/lib/google/client";

export type RawReview = {
  externalId: string;
  authorName: string;
  rating: number;
  text: string;
  reviewedAt: Date;
};

export type ProviderLocation = {
  name: string;
  organizationId: string;
  googlePlaceId?: string | null;
  googleLocationName?: string | null;
};

/**
 * Abstraction over "wherever reviews come from". REVIEW_PROVIDER selects
 * the implementation: "google" (real Google Business Profile, Phase I) or
 * "mock" (sample dental reviews; the demo fallback agreed in Stakeholder
 * Review 1). The rest of the app never knows the difference.
 */
export interface ReviewProvider {
  fetchReviews(location: ProviderLocation): Promise<RawReview[]>;

  postReply(params: {
    location: ProviderLocation;
    externalReviewId: string;
    body: string;
  }): Promise<{ posted: boolean; postedAt: Date }>;
}

const FIXTURE_PATH = path.join(
  process.cwd(),
  "prisma",
  "fixtures",
  "reviews.json",
);

type FixtureFile = Record<
  string,
  Array<{
    externalId: string;
    authorName: string;
    rating: number;
    text: string;
    reviewedAt: string;
  }>
>;

export class MockGoogleBusinessProfileProvider implements ReviewProvider {
  async fetchReviews(location: ProviderLocation): Promise<RawReview[]> {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const fixtures = JSON.parse(raw) as FixtureFile;
    const forLocation = fixtures[location.name] ?? [];

    return forLocation.map((r) => ({
      externalId: r.externalId,
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      reviewedAt: new Date(r.reviewedAt),
    }));
  }

  async postReply(): Promise<{ posted: boolean; postedAt: Date }> {
    // The mock provider simulates a successful post.
    return { posted: true, postedAt: new Date() };
  }
}

export class GoogleReviewProvider implements ReviewProvider {
  private requireLocationName(location: ProviderLocation): string {
    if (!location.googleLocationName) {
      throw new Error(
        `"${location.name}" is not linked to a Google Business Profile location. Link it in Settings → Google.`,
      );
    }
    return location.googleLocationName;
  }

  async fetchReviews(location: ProviderLocation): Promise<RawReview[]> {
    const locationName = this.requireLocationName(location);
    const token = await getAccessToken(location.organizationId);
    const reviews = await listReviews(token, locationName);
    return reviews.map((r) => ({
      externalId: r.reviewId,
      authorName: r.reviewer?.displayName ?? "Google user",
      rating: STAR_TO_NUMBER[r.starRating],
      text: r.comment ?? "",
      reviewedAt: new Date(r.createTime),
    }));
  }

  async postReply(params: {
    location: ProviderLocation;
    externalReviewId: string;
    body: string;
  }): Promise<{ posted: boolean; postedAt: Date }> {
    const locationName = this.requireLocationName(params.location);
    const token = await getAccessToken(params.location.organizationId);
    const res = await updateReply(token, locationName, params.externalReviewId, params.body);
    return { posted: true, postedAt: new Date(res.updateTime ?? Date.now()) };
  }
}

export function getReviewProvider(): ReviewProvider {
  return process.env.REVIEW_PROVIDER === "google"
    ? new GoogleReviewProvider()
    : new MockGoogleBusinessProfileProvider();
}
