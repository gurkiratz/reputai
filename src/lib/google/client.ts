// Thin wrappers over the Google Business Profile REST APIs used in Phase I.
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";
const INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";

export type GbpReview = {
  reviewId: string;
  reviewer?: { displayName?: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | "STAR_RATING_UNSPECIFIED";
  comment?: string;
  createTime: string;
};

export const STAR_TO_NUMBER: Record<GbpReview["starRating"], number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  STAR_RATING_UNSPECIFIED: 3,
};

async function gbpFetch<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    throw new Error(`Google Business Profile API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Fetches every review for a location, following nextPageToken. */
export async function listReviews(token: string, locationName: string): Promise<GbpReview[]> {
  const all: GbpReview[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "50" });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await gbpFetch<{ reviews?: GbpReview[]; nextPageToken?: string }>(
      token,
      `${REVIEWS_BASE}/${locationName}/reviews?${params}`,
    );
    all.push(...(page.reviews ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return all;
}

export async function updateReply(token: string, locationName: string, reviewId: string, comment: string) {
  return gbpFetch<{ comment: string; updateTime: string }>(
    token,
    `${REVIEWS_BASE}/${locationName}/reviews/${reviewId}/reply`,
    { method: "PUT", body: JSON.stringify({ comment }) },
  );
}

/** Lists the locations under a GBP account, e.g. "accounts/123". */
export async function listLocations(token: string, accountName: string) {
  const res = await gbpFetch<{ locations?: { name: string; title: string; storefrontAddress?: { addressLines?: string[] } }[] }>(
    token,
    `${INFO_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress&pageSize=100`,
  );
  // The info API returns "locations/456"; the reviews API needs "accounts/123/locations/456".
  return (res.locations ?? []).map((l) => ({
    name: `${accountName}/${l.name}`,
    title: l.title,
    address: l.storefrontAddress?.addressLines?.join(", ") ?? null,
  }));
}
