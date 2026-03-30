import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { rateLimit } from "@/lib/rate-limit"

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback-secret")
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type RepSection = {
  id: string; type: string; enabled: boolean; order: number;
  categories?: { id: string; name: string; items: { id: string; name: string; description: string; price: string }[] }[]
  [key: string]: unknown
}

function uid() { return Math.random().toString(36).slice(2, 9) }

const DEFAULT_SECTIONS: RepSection[] = [
  { id: "reviews",  type: "reviews",  enabled: true,  order: 0 },
  { id: "menu",     type: "menu",     enabled: true,  order: 1, categories: [] },
  { id: "social",   type: "social",   enabled: true,  order: 2 },
  { id: "hours",    type: "hours",    enabled: false, order: 3 },
  { id: "location", type: "location", enabled: false, order: 4 },
  { id: "photos",   type: "photos",   enabled: false, order: 5 },
]

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const rl = rateLimit(`scan-submit:${ip}`, 5, 60_000)
  if (!rl.ok) return NextResponse.json({ error: "Trop de requêtes, réessayez dans " + rl.retryAfter + "s" }, { status: 429 })

  const { token, imageBase64, mediaType } = await req.json()
  if (!token || !imageBase64) return NextResponse.json({ error: "Données manquantes" }, { status: 400 })

  // Verify token
  let businessId: string
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== "menu-scan") throw new Error("Invalid purpose")
    businessId = payload.businessId as string
  } catch {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 401 })
  }

  // Scan menu with AI
  const type = (mediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp"
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: type, data: imageBase64 } },
        {
          type: "text",
          text: `Extrait tous les plats de cette carte de restaurant.
Réponds UNIQUEMENT avec ce JSON, sans markdown ni texte autour:
{"categories":[{"name":"string","items":[{"name":"string","description":"string","price":"string"}]}]}
Règles STRICTES:
- Inclure TOUTES les catégories visibles
- description: max 70 caractères, "" si absente
- price: format exact tel qu'écrit (ex: "12,50 €", "9€"). "" SEULEMENT si vraiment aucun prix visible.
- Ne rien inventer`,
        },
      ],
    }],
  })

  const raw = (msg.content[0] as { type: string; text: string }).text.trim()
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1) return NextResponse.json({ error: "Impossible de lire la carte" }, { status: 422 })

  let scanned: { categories: { name: string; items: { name: string; description: string; price: string }[] }[] }
  try {
    scanned = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return NextResponse.json({ error: "Format inattendu" }, { status: 422 })
  }

  const newCats = (scanned.categories ?? []).map(c => ({
    id: uid(), name: c.name,
    items: (c.items ?? []).map(item => ({ id: uid(), name: item.name, description: item.description ?? "", price: item.price ?? "" })),
  }))

  // Merge into existing pageConfig
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { pageConfig: true } })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const existingSections: RepSection[] = (business.pageConfig as { sections?: RepSection[] } | null)?.sections ?? DEFAULT_SECTIONS
  const menuSection = existingSections.find(s => s.type === "menu")
  const existingCats = menuSection?.categories ?? []

  // Merge cats by name
  const merged = [...existingCats]
  for (const cat of newCats) {
    const ex = merged.find(c => c.name.toLowerCase().trim() === cat.name.toLowerCase().trim())
    if (ex) ex.items = [...ex.items, ...cat.items]
    else merged.push(cat)
  }

  const updatedSections = existingSections.map(s =>
    s.type === "menu" ? { ...s, categories: merged, enabled: true } : s
  )
  if (!updatedSections.find(s => s.type === "menu")) {
    updatedSections.push({ id: "menu", type: "menu", enabled: true, order: 1, categories: merged })
  }

  await prisma.business.update({
    where: { id: businessId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { pageConfig: { sections: updatedSections } as any },
  })

  return NextResponse.json({ ok: true, categoriesAdded: newCats.length, totalCategories: merged.length })
}
