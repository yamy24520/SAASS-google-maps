import { describe, expect, it } from "vitest"
import { bookingSchema, dateSchema, recurringDates, overlaps, parisSlotInstant } from "../booking-rules"

describe("booking rules", () => {
  it.each(["2026-02-30", "invalid", "2026-13-01"])("rejects invalid calendar date %s", date => {
    expect(dateSchema.safeParse(date).success).toBe(false)
  })
  it("validates public booking input before any database operation", () => {
    expect(bookingSchema.safeParse({ clientName: "Test", clientEmail: "invalid", date: "2026-09-10", timeSlot: "25:00", manualStatus: "PAID" }).success).toBe(false)
  })
  it("keeps monthly recurrences anchored to the original day", () => {
    expect(recurringDates("2026-01-31", "monthly", "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"])
  })
  it("bounds recurrence and rejects invalid end dates", () => {
    expect(() => recurringDates("2026-01-01", "weekly", "2099-12-31")).toThrow("52")
    expect(() => recurringDates("2026-01-01", "weekly", "invalid")).toThrow()
  })
  it("detects overlaps across different start times and buffers", () => {
    expect(overlaps(600, 60, 630, 30)).toBe(true)
    expect(overlaps(600, 30, 630, 30)).toBe(false)
    expect(overlaps(600, 30, 630, 30, 10)).toBe(true)
  })
  it("uses Paris time in winter and summer, independent of the server timezone", () => {
    expect(new Date(parisSlotInstant("2026-01-10", "10:00")).toISOString()).toBe("2026-01-10T09:00:00.000Z")
    expect(new Date(parisSlotInstant("2026-07-10", "10:00")).toISOString()).toBe("2026-07-10T08:00:00.000Z")
    expect(Number.isNaN(parisSlotInstant("2026-03-29", "02:30"))).toBe(true)
  })
})
