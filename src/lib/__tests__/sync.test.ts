import { describe, it, expect } from "vitest"

// ── Dedup / upsert logic tests (pure business logic, no DB) ───────────────────

type ReviewSource = "GOOGLE" | "TRIPADVISOR" | "BOOKING" | "TRUSTPILOT"

interface IncomingReview {
  review_id: string
  review_rating: number
  review_text?: string
  review_datetime_utc: string
  author_title: string
}

interface StoredReview {
  externalReviewId: string
  source: ReviewSource
  rating: number
}

// Simulates the externalId construction used in upsertReviews
function makeExternalId(source: ReviewSource, reviewId: string): string {
  return `${source}:${reviewId}`
}

// Simulates dedup check: returns true if review already exists
function isDuplicate(existing: StoredReview[], source: ReviewSource, reviewId: string): boolean {
  const id = makeExternalId(source, reviewId)
  return existing.some(r => r.externalReviewId === id)
}

// Simulates upsert: adds new reviews, skips existing
function simulateUpsert(
  existing: StoredReview[],
  incoming: IncomingReview[],
  source: ReviewSource
): { inserted: StoredReview[]; skipped: number } {
  const inserted: StoredReview[] = []
  let skipped = 0

  for (const r of incoming) {
    if (!r.review_id) continue
    if (isDuplicate(existing, source, r.review_id)) {
      skipped++
      continue
    }
    inserted.push({
      externalReviewId: makeExternalId(source, r.review_id),
      source,
      rating: Math.round(r.review_rating),
    })
  }

  return { inserted, skipped }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const makeReview = (id: string, rating = 4): IncomingReview => ({
  review_id: id,
  review_rating: rating,
  author_title: "Test User",
  review_datetime_utc: "2024-01-01T00:00:00Z",
})

describe("makeExternalId", () => {
  it("formats correctly", () => {
    expect(makeExternalId("GOOGLE", "abc")).toBe("GOOGLE:abc")
    expect(makeExternalId("TRIPADVISOR", "xyz")).toBe("TRIPADVISOR:xyz")
    expect(makeExternalId("BOOKING", "123")).toBe("BOOKING:123")
    expect(makeExternalId("TRUSTPILOT", "456")).toBe("TRUSTPILOT:456")
  })

  it("same review_id with different sources = different IDs (no cross-platform dedup)", () => {
    const id = "review123"
    expect(makeExternalId("GOOGLE", id)).not.toBe(makeExternalId("TRIPADVISOR", id))
  })
})

describe("isDuplicate", () => {
  it("returns true when review already exists", () => {
    const existing: StoredReview[] = [
      { externalReviewId: "GOOGLE:abc", source: "GOOGLE", rating: 4 },
    ]
    expect(isDuplicate(existing, "GOOGLE", "abc")).toBe(true)
  })

  it("returns false for new review", () => {
    const existing: StoredReview[] = [
      { externalReviewId: "GOOGLE:abc", source: "GOOGLE", rating: 4 },
    ]
    expect(isDuplicate(existing, "GOOGLE", "xyz")).toBe(false)
  })

  it("does not confuse same ID from different sources", () => {
    const existing: StoredReview[] = [
      { externalReviewId: "GOOGLE:abc", source: "GOOGLE", rating: 4 },
    ]
    expect(isDuplicate(existing, "TRIPADVISOR", "abc")).toBe(false)
  })
})

describe("simulateUpsert", () => {
  it("inserts new reviews", () => {
    const { inserted, skipped } = simulateUpsert([], [makeReview("r1"), makeReview("r2")], "GOOGLE")
    expect(inserted).toHaveLength(2)
    expect(skipped).toBe(0)
    expect(inserted[0].externalReviewId).toBe("GOOGLE:r1")
  })

  it("skips existing reviews", () => {
    const existing: StoredReview[] = [
      { externalReviewId: "GOOGLE:r1", source: "GOOGLE", rating: 4 },
    ]
    const { inserted, skipped } = simulateUpsert(existing, [makeReview("r1"), makeReview("r2")], "GOOGLE")
    expect(inserted).toHaveLength(1)
    expect(skipped).toBe(1)
    expect(inserted[0].externalReviewId).toBe("GOOGLE:r2")
  })

  it("skips reviews with missing review_id", () => {
    const invalid = { ...makeReview(""), review_id: "" }
    const { inserted, skipped } = simulateUpsert([], [invalid], "GOOGLE")
    expect(inserted).toHaveLength(0)
    expect(skipped).toBe(0)
  })

  it("rounds rating correctly", () => {
    const { inserted } = simulateUpsert([], [makeReview("r1", 4.6)], "GOOGLE")
    expect(inserted[0].rating).toBe(5)
  })

  it("handles empty incoming array", () => {
    const { inserted, skipped } = simulateUpsert([], [], "GOOGLE")
    expect(inserted).toHaveLength(0)
    expect(skipped).toBe(0)
  })

  it("handles multiple sources independently", () => {
    const existing: StoredReview[] = [
      { externalReviewId: "GOOGLE:r1", source: "GOOGLE", rating: 4 },
    ]
    // Same review_id but different source = not a duplicate
    const { inserted } = simulateUpsert(existing, [makeReview("r1")], "TRIPADVISOR")
    expect(inserted).toHaveLength(1)
    expect(inserted[0].source).toBe("TRIPADVISOR")
  })
})

// ── Rating / isNegative logic ─────────────────────────────────────────────────

describe("isNegative flag", () => {
  it("marks ratings <= 2 as negative", () => {
    const isNegative = (rating: number) => rating <= 2
    expect(isNegative(1)).toBe(true)
    expect(isNegative(2)).toBe(true)
    expect(isNegative(3)).toBe(false)
    expect(isNegative(5)).toBe(false)
  })
})
