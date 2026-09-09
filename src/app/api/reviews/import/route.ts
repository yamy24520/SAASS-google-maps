import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scrapeImportSchema } from "@/lib/scrape-import"

export const maxDuration = 300
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const raw = await req.text()
  if (Buffer.byteLength(raw) > 3_500_000) return NextResponse.json({ error: "Fichier trop volumineux (3,5 Mo maximum)" }, { status: 413 })
  let json: unknown
  try { json = JSON.parse(raw) } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }) }
  const parsed = scrapeImportSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Format de collecte invalide" }, { status: 400 })
  const input = parsed.data
  const unique = [...new Map(input.reviews.map(r => [r.id, r])).values()]
  const business = await prisma.business.upsert({
    where: { userId_scrapePlaceKey: { userId: session.user.id, scrapePlaceKey: input.business.key } },
    create: { userId: session.user.id, scrapePlaceKey: input.business.key, name: input.business.name, alertEmailEnabled: false },
    update: {},
  })
  let inserted = 0
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100)
    const result = await prisma.review.createMany({ skipDuplicates: true, data: batch.map(r => ({
      businessId: business.id, externalReviewId: `${business.id}:GOOGLE:${r.id}`, source: "GOOGLE",
      reviewerName: r.author, rating: r.rating, comment: r.text || null,
      reviewPublishedAt: new Date(input.collectedAt), sourceDateLabel: r.dateLabel, reviewUrl: r.url,
      isNegative: r.rating <= 2, status: r.reply ? "PUBLISHED" : "PENDING", publishedResponse: r.reply,
    })) })
    inserted += result.count
    // Refresh observed owner replies while preserving existing AI drafts.
    await prisma.$transaction(batch.map(r => prisma.review.update({ where: { externalReviewId: `${business.id}:GOOGLE:${r.id}` }, data: {
      reviewerName: r.author, rating: r.rating, comment: r.text || null, isNegative: r.rating <= 2,
      sourceDateLabel: r.dateLabel, ...(r.url ? { reviewUrl: r.url } : {}),
      ...(r.reply ? { publishedResponse: r.reply, status: "PUBLISHED" } : {}),
    } })))
  }
  const [stored, answered] = await Promise.all([prisma.review.count({ where: { businessId: business.id } }), prisma.review.count({ where: { businessId: business.id, publishedResponse: { not: null } } })])
  await prisma.business.update({ where: { id: business.id }, data: { averageRating: input.business.rating, totalReviews: input.business.total, responseRate: stored ? answered / stored * 100 : 0, lastSyncAt: new Date(input.collectedAt) } })
  return NextResponse.json({ businessId: business.id, inserted, stored, answered, announced: input.business.total, stopReason: input.stopReason })
}
