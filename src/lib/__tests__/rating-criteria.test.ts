import { describe, it, expect } from "vitest"
import { getCriteriaForCategory, CATEGORY_CRITERIA, DEFAULT_CRITERIA } from "../rating-criteria"

describe("getCriteriaForCategory", () => {
  it("returns criteria for 'bar' category", () => {
    const criteria = getCriteriaForCategory("bar")
    expect(criteria).toHaveLength(5)
    expect(criteria[0].key).toBe("girlLooks")
  })

  it("returns criteria for 'gogo-bar' category", () => {
    const criteria = getCriteriaForCategory("gogo-bar")
    expect(criteria).toHaveLength(5)
  })

  it("returns criteria for 'massage' category", () => {
    const criteria = getCriteriaForCategory("massage")
    expect(criteria).toHaveLength(5)
    expect(criteria.some((c) => c.key === "massageSkill")).toBe(true)
  })

  it("returns criteria for 'coffee-shop' (weed shop)", () => {
    const criteria = getCriteriaForCategory("coffee-shop")
    expect(criteria.some((c) => c.key === "weedQuality")).toBe(true)
  })

  it("resolves alias 'russian-gogo' to gogo-bar criteria", () => {
    const gogoC = getCriteriaForCategory("gogo-bar")
    const russianC = getCriteriaForCategory("russian-gogo")
    expect(russianC).toEqual(gogoC)
  })

  it("resolves alias 'ladyboy-gogo' to gogo-bar criteria", () => {
    const gogoC = getCriteriaForCategory("gogo-bar")
    const ladyboyC = getCriteriaForCategory("ladyboy-gogo")
    expect(ladyboyC).toEqual(gogoC)
  })

  it("resolves alias 'ladyboy-massage' to massage criteria", () => {
    const massageC = getCriteriaForCategory("massage")
    const ladyboyC = getCriteriaForCategory("ladyboy-massage")
    expect(ladyboyC).toEqual(massageC)
  })

  it("resolves alias 'gay-club' to club criteria", () => {
    const clubC = getCriteriaForCategory("club")
    const gayC = getCriteriaForCategory("gay-club")
    expect(gayC).toEqual(clubC)
  })

  it("returns default criteria for unknown category", () => {
    const criteria = getCriteriaForCategory("unknown-category")
    expect(criteria).toEqual(DEFAULT_CRITERIA.criteria)
  })

  it("all criteria have required fields", () => {
    for (const [, cat] of Object.entries(CATEGORY_CRITERIA)) {
      for (const criterion of cat.criteria) {
        expect(criterion).toHaveProperty("key")
        expect(criterion).toHaveProperty("label")
        expect(criterion).toHaveProperty("required")
        expect(typeof criterion.key).toBe("string")
        expect(typeof criterion.label).toBe("string")
      }
    }
  })

  it("all categories have exactly 5 criteria", () => {
    for (const [name, cat] of Object.entries(CATEGORY_CRITERIA)) {
      expect(cat.criteria, `${name} should have 5 criteria`).toHaveLength(5)
    }
  })
})
