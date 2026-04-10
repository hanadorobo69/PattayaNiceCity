import { describe, it, expect } from "vitest"
import { truncate, generateSlug, calculateHotScore } from "../utils"

describe("truncate", () => {
  it("returns original string if shorter than max", () => {
    expect(truncate("hello", 10)).toBe("hello")
  })

  it("returns original string if exactly max length", () => {
    expect(truncate("hello", 5)).toBe("hello")
  })

  it("truncates and adds ellipsis when too long", () => {
    expect(truncate("hello world", 5)).toBe("hello…")
  })

  it("handles empty string", () => {
    expect(truncate("", 10)).toBe("")
  })

  it("handles max of 0", () => {
    expect(truncate("hello", 0)).toBe("…")
  })

  it("handles multi-byte emoji characters correctly", () => {
    // Each emoji is 1 character but 2+ bytes
    const emoji = "👋🌴🔥🍺👑"
    expect(truncate(emoji, 3)).toBe("👋🌴🔥…")
  })

  it("handles emoji mixed with text", () => {
    expect(truncate("Hi 👋 there", 4)).toBe("Hi 👋…")
  })

  it("trims trailing spaces before ellipsis", () => {
    expect(truncate("hello world foo", 6)).toBe("hello…")
  })
})

describe("generateSlug", () => {
  it("converts to lowercase", () => {
    expect(generateSlug("Hello World")).toBe("hello-world")
  })

  it("handles accented characters", () => {
    expect(generateSlug("café résumé")).toBe("cafe-resume")
  })

  it("removes special characters", () => {
    expect(generateSlug("What's up? #Pattaya!")).toBe("whats-up-pattaya")
  })

  it("trims whitespace", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world")
  })

  it("handles multiple spaces", () => {
    expect(generateSlug("hello   world")).toBe("hello-world")
  })
})

describe("calculateHotScore", () => {
  it("returns higher score for newer posts with same score", () => {
    const now = new Date()
    const hourAgo = new Date(Date.now() - 3600_000)
    const dayAgo = new Date(Date.now() - 86400_000)

    const scoreNew = calculateHotScore(10, now)
    const scoreHour = calculateHotScore(10, hourAgo)
    const scoreDay = calculateHotScore(10, dayAgo)

    expect(scoreNew).toBeGreaterThan(scoreHour)
    expect(scoreHour).toBeGreaterThan(scoreDay)
  })

  it("returns higher score for higher vote count at same age", () => {
    const time = new Date(Date.now() - 3600_000)
    expect(calculateHotScore(100, time)).toBeGreaterThan(calculateHotScore(10, time))
  })

  it("returns 0 for score of 0", () => {
    expect(calculateHotScore(0, new Date())).toBe(0)
  })

  it("handles negative scores", () => {
    const time = new Date(Date.now() - 3600_000)
    expect(calculateHotScore(-5, time)).toBeLessThan(0)
  })
})
