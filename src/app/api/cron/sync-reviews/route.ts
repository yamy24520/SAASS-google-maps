import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { synchronizeReviews } from "@/lib/review-sync"

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  const businesses = await prisma.business.findMany({
    where: { user: { subscription: { status: { in: ["ACTIVE", "TRIALING"] } } } },
    orderBy: { syncAttemptAt: { sort: "asc", nulls: "first" } },
    take: 20,
  })
  let synced = 0
  let processed = 0
  const errors: string[] = []
  const started = Date.now()
  for (const business of businesses) {
    if (Date.now() - started > 200_000) break
    try {
      const result = await synchronizeReviews(business, "cron")
      synced += result.synced
      errors.push(...result.errors.map(error => `${business.id}: ${error}`))
      processed++
    } catch { errors.push(`${business.id}: synchronisation impossible`) }
  }
  return NextResponse.json({ synced, errors, businesses: processed })
}
