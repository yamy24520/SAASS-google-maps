import { beforeEach, afterEach, expect, it, vi } from "vitest"
import { getAvailability } from "../booking-availability"
import type { Prisma } from "@prisma/client"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
const db = {
  business: { findUnique: vi.fn() }, service: { findFirst: vi.fn() },
  closedDate: { findUnique: vi.fn() }, staff: { findMany: vi.fn() },
  staffAbsence: { findMany: vi.fn() }, booking: { findMany: vi.fn() },
}
const transaction = db as unknown as Prisma.TransactionClient
const input = { businessId: "business", date: "2026-09-10", serviceId: "service" }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-09T12:00:00Z"))
  db.business.findUnique.mockResolvedValue({ bookingType: "appointment", bookingHours: { thursday: { open: "09:00", close: "12:00", closed: false } }, bookingSettings: { slotInterval: 30 }, bookingMaxCovers: 10 })
  db.service.findFirst.mockResolvedValue({ duration: 60 })
  db.closedDate.findUnique.mockResolvedValue(null)
  db.staff.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }])
  db.staffAbsence.findMany.mockResolvedValue([])
  db.booking.findMany.mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

it("allows a slot when one staff member is occupied and another is free", async () => {
  db.booking.findMany.mockResolvedValue([{ staffId: "a", timeSlot: "09:00", service: { duration: 60 } }])
  const result = await getAvailability(input, transaction)
  expect(result.slots).toContain("09:30")
  expect(result.staffForSlot["09:30"]).toBe("b")
})
it("rejects overlapping duration for a selected staff member", async () => {
  db.booking.findMany.mockResolvedValue([{ staffId: "a", timeSlot: "09:00", service: { duration: 60 } }])
  const result = await getAvailability({ ...input, staffId: "a" }, transaction)
  expect(result.slots).not.toContain("09:30")
  expect(result.slots).toContain("10:00")
})
it("rejects foreign staff and absent staff", async () => {
  expect((await getAvailability({ ...input, staffId: "foreign" }, transaction)).slots).toEqual([])
  db.staffAbsence.findMany.mockResolvedValue([{ staffId: "a" }])
  expect((await getAvailability({ ...input, staffId: "a" }, transaction)).slots).toEqual([])
})
it("generates bounded restaurant slots with missing interval and accounts for party size", async () => {
  db.business.findUnique.mockResolvedValue({ bookingType: "restaurant", bookingHours: { thursday: { open: "12:00", close: "14:00" } }, bookingSettings: {}, bookingMaxCovers: 5 })
  db.booking.findMany.mockResolvedValue([{ timeSlot: "12:00", partySize: 4 }])
  const result = await getAvailability({ ...input, partySize: 2 }, transaction)
  expect(result.slots).toEqual(["12:30", "13:00", "13:30"])
})
it("honors minimum notice on future dates as well as today", async () => {
  db.business.findUnique.mockResolvedValue({ bookingType: "appointment", bookingHours: { thursday: { open: "09:00", close: "12:00" } }, bookingSettings: { minNoticeHours: 48 } })
  expect((await getAvailability(input, transaction)).slots).toEqual([])
})
