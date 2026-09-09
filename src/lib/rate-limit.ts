import { createHash } from "node:crypto"
import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

/** Atomic PostgreSQL buckets shared by all Vercel instances; no raw emails or IPs stored. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter?: number }> {
  const id = createHash("sha256").update(key).digest("hex")
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowMs)
  const schema = process.env.DATABASE_SCHEMA ?? "public"
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) throw new Error("Invalid database schema")
  const table = Prisma.raw(`"${schema}"."RateLimitBucket"`)
  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO ${table} AS bucket ("id", "count", "expiresAt") VALUES (${id}, 1, ${expiresAt})
    ON CONFLICT ("id") DO UPDATE SET
      "count" = CASE WHEN bucket."expiresAt" <= ${now} THEN 1 ELSE bucket."count" + 1 END,
      "expiresAt" = CASE WHEN bucket."expiresAt" <= ${now} THEN ${expiresAt} ELSE bucket."expiresAt" END
    WHERE bucket."expiresAt" <= ${now} OR bucket."count" < ${limit}
    RETURNING "count", "expiresAt"
  `
  if (rows.length) return { ok: true }
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { id }, select: { expiresAt: true } })
  return { ok: false, retryAfter: Math.max(1, Math.ceil(((bucket?.expiresAt.getTime() ?? expiresAt.getTime()) - now.getTime()) / 1000)) }
}
