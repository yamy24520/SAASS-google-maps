import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function escapeIcal(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function toIcalDT(date: string, time: string) {
  // date = "2026-03-28", time = "09:00" → "20260328T090000"
  return date.replace(/-/g, "") + "T" + time.replace(":", "") + "00"
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse("Non autorisé", { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return new NextResponse("Introuvable", { status: 404 })

  const bookings = await prisma.booking.findMany({
    where: { businessId: business.id, status: { not: "CANCELLED" } },
    include: { service: { select: { name: true, duration: true } } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  })

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reputix//Bookings//FR",
    `X-WR-CALNAME:${escapeIcal(business.name)} — Réservations`,
    "X-WR-TIMEZONE:Europe/Paris",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const booking of bookings) {
    const duration = booking.service?.duration ?? 60
    const dtStart = toIcalDT(booking.date, booking.timeSlot)
    const dtEnd   = toIcalDT(booking.date, addMinutes(booking.timeSlot, duration))
    const summary = `${booking.clientName} — ${booking.service?.name ?? "RDV"}`
    const desc    = [
      booking.clientEmail,
      booking.clientPhone ?? "",
      booking.notes ?? "",
    ].filter(Boolean).join(" | ")

    lines.push(
      "BEGIN:VEVENT",
      `UID:${booking.id}@reputix.net`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcal(summary)}`,
      `DESCRIPTION:${escapeIcal(desc)}`,
      `STATUS:${booking.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")
  const ics = lines.join("\r\n")

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservations-${business.id}.ics"`,
      "Cache-Control": "no-cache",
    },
  })
}
