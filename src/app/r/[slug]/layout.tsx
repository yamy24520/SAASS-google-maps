import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

async function findBusiness(slug: string) {
  const bySlug = await prisma.business.findUnique({ where: { pageSlug: slug } })
  if (bySlug) return bySlug
  return prisma.business.findUnique({ where: { id: slug } })
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const business = await findBusiness(slug)

  if (!business || !business.reputationPageEnabled) {
    return { title: "Page introuvable" }
  }

  const name = business.name
  const tagline = business.pageTagline ?? null
  const description = tagline
    ? `${tagline} — ${name}`
    : `Découvrez ${name} : avis clients, carte, horaires et informations de contact.`
  const pageUrl = `${APP_URL}/r/${business.pageSlug ?? business.id}`

  // Use pageCoverDataUrl as og:image if it's a URL, else fall back to logo
  const ogImage = business.pageCoverDataUrl?.startsWith("http")
    ? business.pageCoverDataUrl
    : business.logoDataUrl?.startsWith("http")
      ? business.logoDataUrl
      : `${APP_URL}/og-default.png`

  return {
    title: `${name} — Avis & Informations`,
    description,
    openGraph: {
      title: `${name} — Avis & Informations`,
      description,
      url: pageUrl,
      siteName: "Reputix",
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Avis & Informations`,
      description,
      images: [ogImage],
    },
    alternates: { canonical: pageUrl },
    robots: { index: true, follow: true },
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
