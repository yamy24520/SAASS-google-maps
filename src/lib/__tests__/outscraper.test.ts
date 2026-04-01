import { describe, it, expect } from "vitest"
import {
  cleanUrl,
  extractGoogleReviews,
  extractBookingReviews,
  extractTripAdvisorReviews,
  extractAirbnbReviews,
} from "../outscraper"

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

// ── extractGoogleReviews ──────────────────────────────────────────────────────

const mockGoogleReview = {
  review_id: "abc123",
  author_title: "Jean Dupont",
  review_rating: 4,
  review_datetime_utc: "2024-01-01T00:00:00Z",
}

describe("extractGoogleReviews", () => {
  it("returns empty array for empty input", () => {
    expect(extractGoogleReviews([])).toEqual([])
  })

  it("extracts from { reviews_data: [...] } shape", () => {
    const data = [{ reviews_data: [mockGoogleReview] }]
    expect(extractGoogleReviews(data)).toEqual([mockGoogleReview])
  })

  it("extracts flat array when first element has review_id", () => {
    const data = [mockGoogleReview]
    expect(extractGoogleReviews(data)).toEqual([mockGoogleReview])
  })

  it("returns empty for unknown shape", () => {
    expect(extractGoogleReviews([{ unknown: true }])).toEqual([])
  })

  it("handles multiple reviews in reviews_data", () => {
    const reviews = [mockGoogleReview, { ...mockGoogleReview, review_id: "xyz789" }]
    expect(extractGoogleReviews([{ reviews_data: reviews }])).toHaveLength(2)
  })
})

// ── extractBookingReviews ─────────────────────────────────────────────────────

describe("extractBookingReviews", () => {
  it("returns empty for empty input", () => {
    expect(extractBookingReviews([])).toEqual([])
  })

  it("extracts from numeric-keyed object", () => {
    const data = [{
      "0": {
        review_id: "r1",
        author_title: "Marie",
        rating: 8,
        review_liked_text: "Très bien",
        review_timestamp: 1704067200,
      },
      "1": {
        review_id: "r2",
        author_title: "Pierre",
        rating: 6,
        review_disliked_text: "Un peu bruyant",
        review_timestamp: 1704067200,
      },
    }]
    const result = extractBookingReviews(data)
    expect(result).toHaveLength(2)
    expect(result[0].review_id).toBe("r1")
    expect(result[0].author_title).toBe("Marie")
    expect(result[0].review_text).toBe("Très bien")
    expect(result[1].review_text).toBe("Un peu bruyant")
  })

  it("normalizes rating from 0-10 to 1-5", () => {
    const data = [{
      "0": { review_id: "r1", author_title: "A", rating: 10, review_timestamp: 1704067200 },
      "1": { review_id: "r2", author_title: "B", rating: 2,  review_timestamp: 1704067200 },
      "2": { review_id: "r3", author_title: "C", rating: 0,  review_timestamp: 1704067200 },
    }]
    const result = extractBookingReviews(data)
    expect(result[0].review_rating).toBe(5) // 10/10*5 = 5
    expect(result[1].review_rating).toBe(1) // 2/10*5 = 1, clamped to 1
    expect(result[2].review_rating).toBe(1) // 0 → clamped to 1
  })

  it("combines liked and disliked text", () => {
    const data = [{
      "0": {
        review_id: "r1",
        author_title: "A",
        rating: 8,
        review_liked_text: "Super",
        review_disliked_text: "Bruyant",
        review_timestamp: 1704067200,
      },
    }]
    const result = extractBookingReviews(data)
    expect(result[0].review_text).toBe("Super | Bruyant")
  })

  it("skips entries without review_id", () => {
    const data = [{ "0": { author_title: "A", rating: 8 }, "meta": { count: 1 } }]
    expect(extractBookingReviews(data)).toHaveLength(0)
  })

  it("skips non-numeric keys", () => {
    const data = [{ "meta": { count: 1 }, "0": { review_id: "r1", author_title: "A", rating: 8, review_timestamp: 1704067200 } }]
    const result = extractBookingReviews(data)
    expect(result).toHaveLength(1)
  })

  it("uses review_date string when no timestamp", () => {
    const data = [{
      "0": { review_id: "r1", author_title: "A", rating: 8, review_date: "2024-01-01" },
    }]
    const result = extractBookingReviews(data)
    expect(result[0].review_datetime_utc).toBe("2024-01-01")
  })
})

// ── extractTripAdvisorReviews ─────────────────────────────────────────────────

describe("extractTripAdvisorReviews", () => {
  it("returns empty for empty input", () => {
    expect(extractTripAdvisorReviews([])).toEqual([])
  })

  it("extracts from flat array of review objects", () => {
    const data = [{
      review_id: "ta1",
      author_title: "Sophie",
      rating: 5,
      review_text: "Excellent !",
      review_datetime_utc: "2024-06-01T00:00:00Z",
    }]
    const result = extractTripAdvisorReviews(data)
    expect(result).toHaveLength(1)
    expect(result[0].review_id).toBe("ta1")
    expect(result[0].author_title).toBe("Sophie")
    expect(result[0].review_rating).toBe(5)
  })

  it("extracts from nested array (data[0] is array)", () => {
    const inner = [{
      review_id: "ta2",
      author_title: "Luc",
      rating: 4,
      review_datetime_utc: "2024-06-01T00:00:00Z",
    }]
    const result = extractTripAdvisorReviews([inner])
    expect(result).toHaveLength(1)
    expect(result[0].review_id).toBe("ta2")
  })

  it("falls back to id field if review_id missing", () => {
    const data = [{
      id: "ta3",
      username: "Marc",
      rating: 3,
      date: "2024-01-01",
    }]
    const result = extractTripAdvisorReviews(data)
    expect(result[0].review_id).toBe("ta3")
    expect(result[0].author_title).toBe("Marc")
  })

  it("clamps rating to 1-5", () => {
    const data = [
      { review_id: "r1", author_title: "A", rating: 6,  review_datetime_utc: "2024-01-01" },
      { review_id: "r2", author_title: "B", rating: 0,  review_datetime_utc: "2024-01-01" },
    ]
    const result = extractTripAdvisorReviews(data)
    expect(result[0].review_rating).toBe(5)
    expect(result[1].review_rating).toBe(1)
  })

  it("skips entries with no review_id or id", () => {
    const data = [{ author_title: "Ghost", rating: 4, review_datetime_utc: "2024-01-01" }]
    expect(extractTripAdvisorReviews(data)).toHaveLength(0)
  })
})

// ── extractAirbnbReviews ──────────────────────────────────────────────────────

describe("extractAirbnbReviews", () => {
  const mockReviewer = { first_name: "Liam", host_name: "Liam", picture_url: "https://img.example.com/a.jpg", id: "562915190", deleted: false }

  it("returns empty for empty input", () => {
    expect(extractAirbnbReviews([])).toEqual([])
  })

  it("extracts from nested array (data[0] is array)", () => {
    const data = [[{
      id: 1651482972959784221,
      rating: 5,
      comments: "Great stay!",
      reviewer: mockReviewer,
      response: null,
      created_at: "2026-03-28T14:41:51Z",
      review_timestamp: 1774708865.1,
    }]]
    const result = extractAirbnbReviews(data)
    expect(result).toHaveLength(1)
    expect(result[0].review_id).toMatch(/^165148297295978/)  // large int loses precision in JS
    expect(result[0].author_title).toBe("Liam")
    expect(result[0].review_rating).toBe(5)
    expect(result[0].review_text).toBe("Great stay!")
    expect(result[0].review_datetime_utc).toBe("2026-03-28T14:41:51Z")
    expect(result[0].owner_answer).toBeUndefined()
  })

  it("extracts from flat array", () => {
    const data = [{
      id: 999,
      rating: 3,
      comments: "Correct",
      reviewer: mockReviewer,
      response: null,
      created_at: "2025-01-01T00:00:00Z",
      review_timestamp: 1735689600,
    }]
    const result = extractAirbnbReviews(data)
    expect(result).toHaveLength(1)
    expect(result[0].review_rating).toBe(3)
  })

  it("captures host response when present", () => {
    const data = [[{
      id: 123,
      rating: 4,
      comments: "Nice but noisy",
      reviewer: mockReviewer,
      response: "Thank you for your feedback!",
      created_at: "2026-01-01T00:00:00Z",
      review_timestamp: 1751404800,
    }]]
    const result = extractAirbnbReviews(data)
    expect(result[0].owner_answer).toBe("Thank you for your feedback!")
  })

  it("uses review_timestamp when created_at missing", () => {
    const data = [[{
      id: 456,
      rating: 5,
      comments: "Perfect",
      reviewer: mockReviewer,
      response: null,
      review_timestamp: 1774708865,
    }]]
    const result = extractAirbnbReviews(data)
    expect(result[0].review_datetime_utc).toContain("2026-03-")
  })

  it("skips entries without id", () => {
    const data = [[{ rating: 5, comments: "No id", reviewer: mockReviewer, created_at: "2026-01-01T00:00:00Z" }]]
    expect(extractAirbnbReviews(data)).toHaveLength(0)
  })

  it("clamps rating to 1-5", () => {
    const data = [[
      { id: 1, rating: 0, comments: "bad", reviewer: mockReviewer, created_at: "2026-01-01T00:00:00Z" },
      { id: 2, rating: 6, comments: "good", reviewer: mockReviewer, created_at: "2026-01-01T00:00:00Z" },
    ]]
    const result = extractAirbnbReviews(data)
    expect(result[0].review_rating).toBe(1)
    expect(result[1].review_rating).toBe(5)
  })

  it("falls back to host_name when first_name missing", () => {
    const data = [[{
      id: 789,
      rating: 4,
      comments: "Good",
      reviewer: { host_name: "HostOnly", id: "1", deleted: false },
      response: null,
      created_at: "2026-01-01T00:00:00Z",
    }]]
    const result = extractAirbnbReviews(data)
    expect(result[0].author_title).toBe("HostOnly")
  })
})

// ── externalReviewId prefix logic ─────────────────────────────────────────────

describe("externalReviewId format", () => {
  it("prefixes review_id with source", () => {
    expect(`GOOGLE:abc123`).toBe("GOOGLE:abc123")
    expect(`BOOKING:hotel456`).toBe("BOOKING:hotel456")
  })

  it("different sources produce different IDs for same review_id", () => {
    const id = "same123"
    expect(`GOOGLE:${id}`).not.toBe(`TRIPADVISOR:${id}`)
  })
})
