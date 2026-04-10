import { describe, it, expect } from "vitest"
import { parseHoursJson, formatSmartHours } from "../venue-hours"

describe("parseHoursJson", () => {
  it("returns null for null input", () => {
    expect(parseHoursJson(null)).toBeNull()
  })

  it("returns null for undefined input", () => {
    expect(parseHoursJson(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseHoursJson("")).toBeNull()
  })

  it("parses valid JSON schedule", () => {
    const json = JSON.stringify({
      Mon: { open: "19:00", close: "03:00", closed: false },
      Tue: { open: "19:00", close: "03:00", closed: false },
      Wed: { open: "19:00", close: "03:00", closed: false },
      Thu: { open: "19:00", close: "03:00", closed: false },
      Fri: { open: "19:00", close: "03:00", closed: false },
      Sat: { open: "19:00", close: "03:00", closed: false },
      Sun: { open: "19:00", close: "03:00", closed: false },
    })
    const result = parseHoursJson(json)
    expect(result).not.toBeNull()
    expect(result!.Mon.open).toBe("19:00")
    expect(result!.Mon.close).toBe("03:00")
    expect(result!.Mon.closed).toBe(false)
  })

  it("parses text format 'Mon-Sun 19:00-03:00'", () => {
    const result = parseHoursJson("Mon-Sun 19:00-03:00")
    expect(result).not.toBeNull()
    expect(result!.Mon.open).toBe("19:00")
    expect(result!.Mon.close).toBe("03:00")
    expect(result!.Mon.closed).toBe(false)
    expect(result!.Sun.closed).toBe(false)
  })

  it("parses text format with en-dash 'Mon–Sun 19:00–03:00'", () => {
    const result = parseHoursJson("Mon–Sun 19:00–03:00")
    expect(result).not.toBeNull()
    expect(result!.Mon.closed).toBe(false)
  })

  it("handles partial week 'Fri-Sun 22:00-05:00'", () => {
    const result = parseHoursJson("Fri-Sun 22:00-05:00")
    expect(result).not.toBeNull()
    expect(result!.Fri.closed).toBe(false)
    expect(result!.Sat.closed).toBe(false)
    expect(result!.Sun.closed).toBe(false)
    expect(result!.Mon.closed).toBe(true)
    expect(result!.Tue.closed).toBe(true)
    expect(result!.Wed.closed).toBe(true)
    expect(result!.Thu.closed).toBe(true)
  })

  it("returns null for invalid text", () => {
    expect(parseHoursJson("garbage text")).toBeNull()
  })

  it("returns null for invalid JSON", () => {
    expect(parseHoursJson("{invalid json}")).toBeNull()
  })
})

describe("formatSmartHours", () => {
  it("returns empty array for null input", () => {
    expect(formatSmartHours(null)).toEqual([])
  })

  it("returns empty array for invalid input", () => {
    expect(formatSmartHours("garbage")).toEqual([])
  })

  it("groups all days when same hours", () => {
    const result = formatSmartHours("Mon-Sun 19:00-03:00", "en")
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("Mon-Sun")
  })

  it("formats time in 12h for English", () => {
    const result = formatSmartHours("Mon-Sun 19:00-03:00", "en")
    expect(result[0]).toContain("7 PM")
    expect(result[0]).toContain("3 AM")
  })

  it("formats time in French style", () => {
    const result = formatSmartHours("Mon-Sun 19:00-03:00", "fr")
    expect(result[0]).toContain("19h")
    expect(result[0]).toContain("3h")
  })

  it("uses French day names", () => {
    const result = formatSmartHours("Mon-Sun 19:00-03:00", "fr")
    expect(result[0]).toMatch(/Lun/)
    expect(result[0]).toMatch(/Dim/)
  })

  it("uses Chinese day names", () => {
    const result = formatSmartHours("Mon-Sun 19:00-03:00", "zh")
    expect(result[0]).toContain("周一")
    expect(result[0]).toContain("周日")
  })

  it("uses Thai day names", () => {
    const result = formatSmartHours("Mon-Sun 19:00-03:00", "th")
    expect(result[0]).toContain("จ.")
    expect(result[0]).toContain("อา.")
  })

  it("excludes closed days from output", () => {
    const result = formatSmartHours("Fri-Sun 22:00-05:00", "en")
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("Fri-Sun")
  })

  it("handles JSON schedule with mixed hours", () => {
    const schedule = JSON.stringify({
      Mon: { open: "19:00", close: "02:00", closed: false },
      Tue: { open: "19:00", close: "02:00", closed: false },
      Wed: { open: "19:00", close: "02:00", closed: false },
      Thu: { open: "19:00", close: "02:00", closed: false },
      Fri: { open: "20:00", close: "04:00", closed: false },
      Sat: { open: "20:00", close: "04:00", closed: false },
      Sun: { open: "", close: "", closed: true },
    })
    const result = formatSmartHours(schedule, "en")
    expect(result).toHaveLength(2) // Mon-Thu and Fri-Sat
  })

  it("defaults closedLabel to 'Closed'", () => {
    const result = formatSmartHours("Fri-Sun 22:00-05:00")
    expect(result).toHaveLength(1) // Only open days shown
  })
})
