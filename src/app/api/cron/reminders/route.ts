import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBookingReminderClient } from "@/lib/email"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

export async function GET(req: NextRequest) {
  // Vérifier le secret Vercel Cron
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Trouver la date de demain
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0] // "2026-03-29"

  // Chercher tous les RDV confirmés de demain sans rappel envoyé
  const bookings = await prisma.booking.findMany({
    where: {
      date: tomorrowStr,
      status: "CONFIRMED",
      reminderSentAt: null,
    },
    include: {
      service: { select: { name: true, duration: true, price: true } },
      business: { select: { name: true } },
    },
  })

  const results = await Promise.allSettled(
    bookings.map(async (booking) => {
      const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })

      await sendBookingReminderClient({
        clientEmail: booking.clientEmail,
        clientName: booking.clientName,
        businessName: booking.business.name,
        serviceName: booking.service?.name ?? "Réservation",
        date: dateLabel,
        timeSlot: booking.timeSlot,
        duration: booking.service?.duration ?? 0,
        price: booking.service?.price ?? 0,
        cancelUrl: booking.cancelToken ? `${APP_URL}/cancel/${booking.cancelToken}` : undefined,
      })

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      })
    })
  )

  const sent = results.filter(r => r.status === "fulfilled").length
  const failed = results.filter(r => r.status === "rejected").length

  return NextResponse.json({ sent, failed, date: tomorrowStr })
}
