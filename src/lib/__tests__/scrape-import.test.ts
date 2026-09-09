import { beforeEach, expect, it, vi } from "vitest"
import { POST } from "@/app/api/reviews/import/route"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: { business: { upsert: vi.fn(), update: vi.fn() }, review: { createMany: vi.fn(), update: vi.fn(), count: vi.fn() }, $transaction: vi.fn(async p => Promise.all(p)) } }))
const input = { version: 1, collectedAt: "2026-09-10T00:00:00.000Z", business: { key: "0x12:0x34", name: "Restaurant", url: "https://www.google.com/maps/place/Restaurant", rating: 4.4, total: 20 }, reviews: [{ id: "r1", author: "Client", rating: 5, text: "Bien", dateLabel: "il y a un mois", reply: "Merci", url: "https://maps.app.goo.gl/example" }], stopReason: "Test" }
beforeEach(() => { vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner" } } as never); vi.mocked(prisma.business.upsert).mockResolvedValue({ id: "separate-business" } as never); vi.mocked(prisma.review.createMany).mockResolvedValue({ count: 1 }); vi.mocked(prisma.review.update).mockResolvedValue({} as never); vi.mocked(prisma.review.count).mockResolvedValue(1) })
it("binds scraped data to owner and Maps identity, deduplicates input and retains replies", async () => {
 const res = await POST(new Request("http://localhost/api/reviews/import", { method: "POST", body: JSON.stringify({ ...input, reviews: [input.reviews[0], input.reviews[0]] }) }))
 expect(res.status).toBe(200)
 expect(prisma.business.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_scrapePlaceKey: { userId: "owner", scrapePlaceKey: "0x12:0x34" } } }))
 const rows=vi.mocked(prisma.review.createMany).mock.calls[0][0]?.data as unknown[]
 expect(rows).toHaveLength(1)
 expect(rows[0]).toEqual(expect.objectContaining({ businessId: "separate-business", publishedResponse: "Merci", sourceDateLabel: "il y a un mois" }))
 expect(prisma.review.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ aiDraftResponse: expect.anything() }) }))
})
it("rejects an unauthenticated import", async () => { vi.mocked(getServerSession).mockResolvedValue(null); expect((await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(input) }))).status).toBe(401) })
it("rejects unsafe review links before writing", async () => { expect((await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ ...input, reviews: [{ ...input.reviews[0], url: "https://attacker.example" }] }) }))).status).toBe(400); expect(prisma.business.upsert).not.toHaveBeenCalled() })
