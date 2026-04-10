"use client"

import { useState, useRef, useCallback } from "react"
import { ChevronDown, Star, User } from "lucide-react"
import { StarRating } from "@/components/posts/star-rating"
import type { RatingCriterion } from "@/lib/rating-criteria"

interface IndividualRating {
  id: string
  overall: number
  scores: string
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

interface VenueIndividualRatingsProps {
  ratings: IndividualRating[]
  criteria: RatingCriterion[]
  embedded?: boolean
}

export function VenueIndividualRatings({ ratings, criteria, embedded }: VenueIndividualRatingsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const toggleExpand = useCallback((id: string) => {
    const isOpen = expandedId === id
    setExpandedId(isOpen ? null : id)
    if (!isOpen) {
      setTimeout(() => {
        itemRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 50)
    }
  }, [expandedId])

  if (ratings.length === 0) return null

  if (embedded) {
    return (
      <div className="divide-y divide-border">
        {ratings.map((r) => {
          const isOpen = expandedId === r.id
          let parsedScores: Record<string, number> = {}
          try { parsedScores = JSON.parse(r.scores) } catch {}
          const date = new Date(r.createdAt)
          const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

          return (
            <div key={r.id} ref={(el) => { itemRefs.current[r.id] = el }}>
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
              >
                {r.author.avatarUrl ? (
                  <img src={r.author.avatarUrl} alt={r.author.displayName || r.author.username} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{r.author.displayName || r.author.username}</span>
                  <span className="text-xs text-muted-foreground">{dateStr}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StarRating value={r.overall} size="sm" />
                  <span className="text-sm font-bold tabular-nums text-foreground">{r.overall.toFixed(1)}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && Object.keys(parsedScores).length > 0 && (
                <div className="px-5 pb-4 pt-1 space-y-1.5 bg-muted/10">
                  {criteria.map((c) => {
                    const val = parsedScores[c.key]
                    if (val == null) return null
                    return (
                      <div key={c.key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground truncate">{c.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StarRating value={val} size="sm" />
                          <span className="text-xs font-semibold tabular-nums w-5 text-right">{val.toFixed(1)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border satine-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b satine-border">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
          Individual Ratings ({ratings.length})
        </h3>
      </div>
      <div className="divide-y divide-border">
        {ratings.map((r) => {
          const isOpen = expandedId === r.id
          let parsedScores: Record<string, number> = {}
          try { parsedScores = JSON.parse(r.scores) } catch {}
          const date = new Date(r.createdAt)
          const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

          return (
            <div key={r.id} ref={(el) => { itemRefs.current[r.id] = el }}>
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
              >
                {/* Avatar */}
                {r.author.avatarUrl ? (
                  <img
                    src={r.author.avatarUrl}
                    alt={r.author.displayName || r.author.username}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">
                    {r.author.displayName || r.author.username}
                  </span>
                  <span className="text-xs text-muted-foreground">{dateStr}</span>
                </div>

                {/* Overall stars + score */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <StarRating value={r.overall} size="sm" />
                  <span className="text-sm font-bold tabular-nums text-foreground">{r.overall.toFixed(1)}</span>
                </div>

                {/* Chevron */}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Expanded detail */}
              {isOpen && Object.keys(parsedScores).length > 0 && (
                <div className="px-5 pb-4 pt-1 space-y-1.5 bg-muted/10">
                  {criteria.map((c) => {
                    const val = parsedScores[c.key]
                    if (val == null) return null
                    return (
                      <div key={c.key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground truncate">{c.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StarRating value={val} size="sm" />
                          <span className="text-xs font-semibold tabular-nums w-5 text-right">{val.toFixed(1)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
