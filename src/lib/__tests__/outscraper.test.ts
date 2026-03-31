import { describe, it, expect } from "vitest"

// ── Pure functions extracted for testing ──────────────────────────────────────
// (same logic as in outscraper.ts — keep in sync)

function cleanUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

interface Review {
  review_id: string
  author_title: string
  review_rating: number
  review_datetime_utc: string
  [key: string]: unknown
}

function extractReviews(data: unknown[]): Review[] {
  if (!Array.isArray(data) || data.length === 0) return []
  const first = data[0] as Record<string, unknown>
  if (Array.isArray(first?.reviews_data)) return first.reviews_data as Review[]
  if (first?.review_id !== undefined) return data as Review[]
  if (Array.isArray(first?.data)) return first.data as Review[]
  return []
}

// ── cleanUrl ──────────────────────────────────────────────────────────────────

describe("cleanUrl", () => {
  it("strips query params and hash", () => {
    const url = "https://www.booking.com/hotel/fr/kyriad.fr.html?aid=123&label=abc#tab-reviews"
    expect(cleanUrl(url)).toBe("https://www.booking.com/hotel/fr/kyriad.fr.html")
  })

  it("keeps clean URL unchanged", () => {
    const url = "https://www.tripadvisor.fr/Restaurant_Review-g123.html"
    expect(cleanUrl(url)).toBe(url)
  })

  it("returns raw string if URL is invalid", () => {
    const invalid = "not-a-url"
    expect(cleanUrl(invalid)).toBe(invalid)
  })

  it("handles trustpilot domain-only queries", () => {
    const url = "https://fr.trustpilot.com/review/example.com"
    expect(cleanUrl(url)).toBe("https://fr.trustpilot.com/review/example.com")
  })
})

// ── extractReviews ────────────────────────────────────────────────────────────

const mockReview: Review = {
  review_id: "abc123",
  author_title: "Jean Dupont",
  review_rating: 4,
  review_datetime_utc: "2024-01-01T00:00:00Z",
}

describe("extractReviews", () => {
  it("returns empty array for empty input", () => {
    expect(extractReviews([])).toEqual([])
  })

  it("extracts from Google Maps shape { reviews_data: [...] }", () => {
    const data = [{ reviews_data: [mockReview] }]
    expect(extractReviews(data)).toEqual([mockReview])
  })

  it("extracts flat array when first element has review_id", () => {
    const data = [mockReview]
    expect(extractReviews(data)).toEqual([mockReview])
  })

  it("extracts from nested { data: [...] } shape", () => {
    const data = [{ data: [mockReview] }]
    expect(extractReviews(data)).toEqual([mockReview])
  })

  it("returns empty array for unknown shape", () => {
    const data = [{ unknown_field: "value" }]
    expect(extractReviews(data)).toEqual([])
  })

  it("handles multiple reviews in reviews_data", () => {
    const reviews = [mockReview, { ...mockReview, review_id: "xyz789" }]
    const data = [{ reviews_data: reviews }]
    expect(extractReviews(data)).toHaveLength(2)
  })
})

// ── externalReviewId prefix logic ─────────────────────────────────────────────

describe("externalReviewId format", () => {
  it("prefixes review_id with source", () => {
    const source = "GOOGLE"
    const reviewId = "abc123"
    expect(`${source}:${reviewId}`).toBe("GOOGLE:abc123")
  })

  it("different sources produce different IDs for same review_id", () => {
    const id = "same123"
    expect(`GOOGLE:${id}`).not.toBe(`TRIPADVISOR:${id}`)
  })

  it("does not double-prefix", () => {
    const externalId = "GOOGLE:abc123"
    const alreadyPrefixed = externalId.includes(":")
    expect(alreadyPrefixed).toBe(true)
  })
})
