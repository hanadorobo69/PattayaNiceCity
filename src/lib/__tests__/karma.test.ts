import { describe, it, expect } from "vitest"
import { getKarmaTier, getNextTier, KARMA_TIERS, KARMA_REWARDS } from "../karma"

describe("getKarmaTier", () => {
  it("returns Lurker for karma 0", () => {
    expect(getKarmaTier(0).label).toBe("Lurker")
  })

  it("returns Lurker for karma 9", () => {
    expect(getKarmaTier(9).label).toBe("Lurker")
  })

  it("returns Tourist for karma 10", () => {
    expect(getKarmaTier(10).label).toBe("Tourist")
  })

  it("returns Tourist for karma 49", () => {
    expect(getKarmaTier(49).label).toBe("Tourist")
  })

  it("returns Regular for karma 50", () => {
    expect(getKarmaTier(50).label).toBe("Regular")
  })

  it("returns Local for karma 150", () => {
    expect(getKarmaTier(150).label).toBe("Local")
  })

  it("returns OG for karma 400", () => {
    expect(getKarmaTier(400).label).toBe("OG")
  })

  it("returns Legend for karma 1000", () => {
    expect(getKarmaTier(1000).label).toBe("Legend")
  })

  it("returns Legend for very high karma", () => {
    expect(getKarmaTier(99999).label).toBe("Legend")
  })

  it("returns Lurker for negative karma", () => {
    expect(getKarmaTier(-10).label).toBe("Lurker")
  })

  it("each tier has all required fields", () => {
    for (const tier of KARMA_TIERS) {
      expect(tier).toHaveProperty("min")
      expect(tier).toHaveProperty("label")
      expect(tier).toHaveProperty("color")
      expect(tier).toHaveProperty("emoji")
      expect(tier).toHaveProperty("description")
    }
  })
})

describe("getNextTier", () => {
  it("returns Tourist as next tier for karma 0", () => {
    expect(getNextTier(0)?.label).toBe("Tourist")
  })

  it("returns Regular as next tier for karma 10", () => {
    expect(getNextTier(10)?.label).toBe("Regular")
  })

  it("returns Regular as next tier for karma 49", () => {
    expect(getNextTier(49)?.label).toBe("Regular")
  })

  it("returns null when already Legend", () => {
    expect(getNextTier(1000)).toBeNull()
  })

  it("returns null for very high karma", () => {
    expect(getNextTier(50000)).toBeNull()
  })
})

describe("KARMA_REWARDS", () => {
  it("POST_CREATED gives positive karma", () => {
    expect(KARMA_REWARDS.POST_CREATED).toBeGreaterThan(0)
  })

  it("POST_DOWNVOTED gives negative karma", () => {
    expect(KARMA_REWARDS.POST_DOWNVOTED).toBeLessThan(0)
  })

  it("COMMENT_CREATED gives positive karma", () => {
    expect(KARMA_REWARDS.COMMENT_CREATED).toBeGreaterThan(0)
  })

  it("upvote rewards are greater than downvote penalties", () => {
    expect(KARMA_REWARDS.POST_UPVOTED).toBeGreaterThan(Math.abs(KARMA_REWARDS.POST_DOWNVOTED))
  })
})
