import { beforeAll, afterAll, afterEach, expect, it, vi } from "vitest"
import { PGlite } from "@electric-sql/pglite"
import { readFile } from "node:fs/promises"
import { rateLimit } from "../rate-limit"
import { Prisma } from "@prisma/client"

const database = vi.hoisted(() => ({ current: null as PGlite | null }))
vi.mock("../prisma", () => ({ prisma: {
  $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Prisma.sql(parts, ...values)
    return (await database.current!.query(sql.text, sql.values)).rows
  },
  rateLimitBucket: { findUnique: async ({ where }: { where: { id: string } }) => {
    return (await database.current!.query('SELECT "expiresAt" FROM "RateLimitBucket" WHERE id = $1', [where.id])).rows[0] ?? null
  } },
} }))

beforeAll(async () => {
  database.current = new PGlite()
  await database.current.exec('CREATE TABLE "Business" (id TEXT PRIMARY KEY, "gbpLocationId" TEXT, name TEXT)')
  await database.current.exec(`INSERT INTO "Business" VALUES ('legacy', 'accounts/a/locations/b', 'Keep me'), ('maps', 'place-id', 'Also keep me')`)
  for (const migration of ["20260909220000_review_sync_controls", "20260909221000_shared_rate_limits"]) {
    await database.current.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"))
  }
}, 20000)
afterAll(async () => database.current?.close())
afterEach(() => vi.useRealTimers())

it("applies additive migrations without changing Maps IDs or existing names", async () => {
  const { rows } = await database.current!.query<{ id: string; name: string; gbpLocationId: string; gbpReviewLocationId: string | null }>('SELECT * FROM "Business" ORDER BY id')
  expect(rows[0]).toMatchObject({ id: "legacy", name: "Keep me", gbpLocationId: "accounts/a/locations/b", gbpReviewLocationId: "accounts/a/locations/b" })
  expect(rows[1]).toMatchObject({ id: "maps", name: "Also keep me", gbpLocationId: "place-id", gbpReviewLocationId: null })
})

it("enforces the quota across concurrent calls using real PostgreSQL", async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit("concurrent", 5, 60000)))
  expect(results.filter(result => result.ok)).toHaveLength(5)
  expect(results.filter(result => !result.ok)).toHaveLength(15)
  expect(results.find(result => !result.ok)?.retryAfter).toBeGreaterThan(0)
})

it("resets expired buckets and keeps different clients independent", async () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-09-10T12:00:00Z"))
  expect((await rateLimit("client-a", 1, 60000)).ok).toBe(true)
  expect((await rateLimit("client-a", 1, 60000)).ok).toBe(false)
  expect((await rateLimit("client-b", 1, 60000)).ok).toBe(true)
  vi.setSystemTime(new Date("2026-09-10T12:01:01Z"))
  expect((await rateLimit("client-a", 1, 60000)).ok).toBe(true)
})
