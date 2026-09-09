import { afterEach, describe, expect, it, vi } from "vitest"
import { boundedReviewLimit, fetchReviewsOutscraper, fetchBookingReviews, outscraperEnabled } from "../outscraper"

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("paid import protection", () => {
  it("disables paid calls by default even when a key exists", async () => {
    vi.stubEnv("OUTSCRAPER_ENABLED", "")
    vi.stubEnv("OUTSCRAPER_API_KEY", "test-key")
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(outscraperEnabled()).toBe(false)
    await expect(fetchReviewsOutscraper("place", 0)).rejects.toThrow("désactivé")
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([0, -1, NaN, Infinity, 500_000, 0.1])("never sends unlimited or invalid volumes: %s", async limit => {
    vi.stubEnv("OUTSCRAPER_ENABLED", "true")
    vi.stubEnv("OUTSCRAPER_API_KEY", "test-key")
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
    vi.stubGlobal("fetch", fetch)
    await fetchReviewsOutscraper("place", limit)
    await fetchBookingReviews("https://www.booking.com/hotel/example", limit)
    for (const [url] of fetch.mock.calls) {
      const params = new URL(url).searchParams
      const value = Number(params.get("reviewsLimit") ?? params.get("limit"))
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThanOrEqual(50)
    }
  })
  it("preserves smaller valid limits", () => { expect(boundedReviewLimit(12)).toBe(12) })
})
