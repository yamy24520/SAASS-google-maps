import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function escapeIcal(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function toIcalDT(date: string, time: string) {
  return date.replace(/-/g, "") + "T" + time.replace(":", "") + "00"
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

// Feed iCal public (pas d'auth — token dans l'URL)
// Le token peut appartenir à un Business (tous les RDV) ou à un Staff (ses RDV uniquement)
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // 1. Chercher d'abord si c'est un token de prestataire
  const staffMatch = await prisma.staff.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true, businessId: true, business: { select: { name: true } } },
  })

  // 2. Sinon chercher le token business général
  const business = staffMatch
    ? { id: staffMatch.businessId, name: staffMatch.business.name }
    : await prisma.business.findUnique({
        where: { calendarToken: token },
        select: { id: true, name: true },
      })

  if (!business) return new NextResponse("Calendrier introuvable", { status: 404 })

  const calName = staffMatch
    ? `${escapeIcal(staffMatch.name)} — ${escapeIcal(business.name)}`
    : `${escapeIcal(business.name)} — Réservations`

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      status: { not: "CANCELLED" },
      ...(staffMatch ? { staffId: staffMatch.id } : {}),
    },
    include: {
      service: { select: { name: true, duration: true } },
      staff: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  })

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reputix//Bookings//FR",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:Europe/Paris",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ]

  for (const booking of bookings) {
    const duration = booking.service?.duration ?? 60
    const dtStart = toIcalDT(booking.date, booking.timeSlot)
    const dtEnd   = toIcalDT(booking.date, addMinutes(booking.timeSlot, duration))
    const summary = `${booking.clientName}${booking.service ? ` — ${booking.service.name}` : ""}`
    const descParts = [
      booking.clientEmail,
      booking.clientPhone ?? "",
      booking.staff ? `Avec ${booking.staff.name}` : "",
      booking.notes ?? "",
    ].filter(Boolean)

    lines.push(
      "BEGIN:VEVENT",
      `UID:${booking.id}@reputix.net`,
      `DTSTART;TZID=Europe/Paris:${dtStart}`,
      `DTEND;TZID=Europe/Paris:${dtEnd}`,
      `SUMMARY:${escapeIcal(summary)}`,
      `DESCRIPTION:${escapeIcal(descParts.join(" | "))}`,
      `STATUS:${booking.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
    },
  })
}
