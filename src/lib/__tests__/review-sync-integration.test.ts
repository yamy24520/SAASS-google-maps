import { beforeEach, afterEach, expect, it, vi } from "vitest"
import type { Business } from "@prisma/client"
import { synchronizeReviews, storeReviews } from "../review-sync"
import { prisma } from "@/lib/prisma"
import { listReviews } from "../google-business"

vi.mock("@/lib/prisma", () => ({ prisma: {
  business: { updateMany: vi.fn(), update: vi.fn() },
  review: { findFirst: vi.fn(), createMany: vi.fn(), update: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
} }))
vi.mock("@/lib/google-business", () => ({ listReviews: vi.fn(), starRatingToNumber: () => 4 }))
vi.mock("@/lib/email", () => ({ sendNegativeReviewAlert: vi.fn() }))
const business = { id: "business", gbpLocationId: "public-place", gbpReviewLocationId: "accounts/a/locations/b", gbpRefreshToken: "test", alertEmailEnabled: false, tripAdvisorUrl: "https://tripadvisor.fr/example" } as Business
it("never contacts a review provider in scraping mode, even with paid collection enabled", async () => {
  vi.stubEnv("REVIEW_COLLECTION_MODE", "scraping")
  vi.stubEnv("OUTSCRAPER_ENABLED", "true")
  vi.stubEnv("OUTSCRAPER_CRON_ENABLED", "true")
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  try {
    for (const mode of ["manual", "cron"] as const) {
      const result = await synchronizeReviews(business, mode)
      expect(result.synced).toBe(0)
      expect(result.warnings.join(" ")).toContain("collecteur")
    }
    expect(fetch).not.toHaveBeenCalled()
    expect(listReviews).not.toHaveBeenCalled()
    expect(prisma.business.updateMany).not.toHaveBeenCalled()
  } finally { vi.unstubAllGlobals() }
})
beforeEach(() => {
  vi.stubEnv("OUTSCRAPER_ENABLED", "false")
  vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.review.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.review.createMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.review.aggregate).mockResolvedValue({ _count: 1, _avg: { rating: 4 } } as never)
  vi.mocked(prisma.review.count).mockResolvedValue(0)
  vi.mocked(listReviews).mockResolvedValue({ reviews: [] })
})
afterEach(() => vi.unstubAllEnvs())

it("uses official Google and never makes a paid call when disabled", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch)
  const result = await synchronizeReviews(business, "manual")
  expect(listReviews).toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
  expect(result.warnings.some(warning => warning.includes("TRIPADVISOR"))).toBe(true)
  vi.unstubAllGlobals()
})
it("makes no provider call when another instance holds the database lock", async () => {
  vi.mocked(prisma.business.updateMany).mockResolvedValueOnce({ count: 0 })
  expect((await synchronizeReviews(business, "manual")).cached).toBe(true)
  expect(listReviews).not.toHaveBeenCalled()
})
it("surfaces a Google failure without silently falling back to paid imports", async () => {
  vi.mocked(listReviews).mockRejectedValueOnce(new Error("upstream"))
  const result = await synchronizeReviews(business, "manual")
  expect(result.errors).toHaveLength(1)
  expect(prisma.business.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastSyncAt: expect.any(Date) }) }))
  expect(prisma.business.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { syncLeaseUntil: null } }))
})
it("scopes review IDs per business, counts inserted rows, and sanitizes invalid dates", async () => {
  await storeReviews("other-business", "GOOGLE", [{ review_id: "same-id", author_title: "Test", review_rating: 7, review_datetime_utc: "invalid" }])
  expect(prisma.review.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ businessId: "other-business", externalReviewId: "other-business:GOOGLE:same-id", rating: 5, reviewPublishedAt: expect.any(Date) })], skipDuplicates: true }))
})

it("imports public Maps reviews without a Google login, capped at 25", async () => {
  vi.stubEnv("OUTSCRAPER_ENABLED", "true")
  vi.stubEnv("OUTSCRAPER_API_KEY", "test-only")
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ reviews_data: [{ review_id: "public-review", author_title: "Client", review_rating: 5, review_datetime_utc: "2026-09-01" }] }] })))
  vi.stubGlobal("fetch", fetch)
  try {
    const result = await synchronizeReviews({ ...business, gbpReviewLocationId: null, gbpRefreshToken: null, gbpAccessToken: null, tripAdvisorUrl: null }, "manual")
    expect(result.synced).toBe(1)
    expect(result.errors).toEqual([])
    expect(listReviews).not.toHaveBeenCalled()
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("reviewsLimit")).toBe("25")
    expect(fetch).toHaveBeenCalledTimes(1)
  } finally { vi.unstubAllGlobals() }
})

it("does not make paid cron requests when only manual imports are enabled", async () => {
  vi.stubEnv("OUTSCRAPER_ENABLED", "true")
  vi.stubEnv("OUTSCRAPER_API_KEY", "test-only")
  vi.stubEnv("OUTSCRAPER_CRON_ENABLED", "false")
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch)
  try {
    await synchronizeReviews({ ...business, gbpReviewLocationId: null, gbpRefreshToken: null }, "cron")
    expect(fetch).not.toHaveBeenCalled()
  } finally { vi.unstubAllGlobals() }
})
it("imports a clearly limited Places preview when Outscraper billing refuses", async () => {
  vi.stubEnv("OUTSCRAPER_ENABLED", "true")
  vi.stubEnv("OUTSCRAPER_API_KEY", "test-only")
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response("Billing required", { status: 402 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ reviews: [{ name: "places/p/reviews/r", authorAttribution: { displayName: "Client" }, rating: 5, publishTime: "2026-09-01", text: { text: "Très bien" } }] })))
  vi.stubGlobal("fetch", fetch)
  try {
    const result = await synchronizeReviews({ ...business, gbpReviewLocationId: null, gbpRefreshToken: null, gbpAccessToken: null, tripAdvisorUrl: null }, "manual")
    expect(result.synced).toBe(1)
    expect(result.errors).toEqual([])
    expect(result.warnings.join(" ")).toContain("limité à 5 avis")
    expect(fetch).toHaveBeenCalledTimes(2)
  } finally { vi.unstubAllGlobals() }
})
