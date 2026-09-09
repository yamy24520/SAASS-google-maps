import { z } from "zod"

export const mapsUrl = z.string().url().refine(value => {
  const u = new URL(value)
  return u.protocol === "https:" && ((u.hostname === "www.google.com" && u.pathname.startsWith("/maps")) || u.hostname === "maps.app.goo.gl")
}, "Lien Google Maps invalide")
export const scrapeImportSchema = z.object({
  version: z.literal(1),
  collectedAt: z.string().datetime(),
  business: z.object({ key: z.string().regex(/^0x[0-9a-f]+:0x[0-9a-f]+$/i), name: z.string().min(1).max(200), url: mapsUrl, rating: z.number().min(0).max(5), total: z.number().int().min(0).max(10000000) }),
  reviews: z.array(z.object({ id: z.string().min(1).max(500), author: z.string().min(1).max(300), rating: z.number().int().min(1).max(5), text: z.string().max(30000), dateLabel: z.string().max(200), reply: z.string().max(30000).nullable(), url: mapsUrl.nullable() })).min(1).max(10000),
  stopReason: z.string().max(300),
})
