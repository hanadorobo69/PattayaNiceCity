export interface KarmaTier {
  min: number
  label: string
  color: string
  emoji: string
  description: string
}

export const KARMA_TIERS: KarmaTier[] = [
  { min: 0,    label: "Lurker",   color: "#6B7280", emoji: "👀", description: "Just arrived in Pattaya" },
  { min: 10,   label: "Tourist",  color: "#60A5FA", emoji: "✈️", description: "Getting familiar with the scene" },
  { min: 50,   label: "Regular",  color: "#34D399", emoji: "🍺", description: "Knows the good spots" },
  { min: 150,  label: "Local",    color: "#A78BFA", emoji: "🌴", description: "Part of the community" },
  { min: 400,  label: "OG",       color: "#F59E0B", emoji: "🔥", description: "Pattaya veteran" },
  { min: 1000, label: "Legend",   color: "#EC4899", emoji: "👑", description: "The absolute reference" },
]

// Karma points awarded per action
export const KARMA_REWARDS = {
  POST_CREATED:      10,
  POST_UPVOTED:       5,
  POST_DOWNVOTED:    -2,
  POST_UNVOTED:      -5, // vote removed that was an upvote
  COMMENT_CREATED:    2,
  COMMENT_UPVOTED:    3,
  COMMENT_DOWNVOTED: -1,
} as const

export function getKarmaTier(karma: number): KarmaTier {
  const sorted = [...KARMA_TIERS].sort((a, b) => b.min - a.min)
  return sorted.find(t => karma >= t.min) ?? KARMA_TIERS[0]
}

export function getNextTier(karma: number): KarmaTier | null {
  const sorted = [...KARMA_TIERS].sort((a, b) => a.min - b.min)
  return sorted.find(t => t.min > karma) ?? null
}
