"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number        // 0-5, can be decimal for display
  max?: number
  interactive?: boolean
  onChange?: (value: number) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StarRating({ value, max = 5, interactive = false, onChange, size = "md", className }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const display = hovered ?? value

  const sizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1
        const filled = display >= starValue
        const halfFilled = !filled && display >= starValue - 0.5

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(null)}
            className={cn(
              "transition-transform relative",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default pointer-events-none"
            )}
            style={{ width: sizes[size].includes("h-3") ? 12 : sizes[size].includes("h-4") ? 16 : 20, height: sizes[size].includes("h-3") ? 12 : sizes[size].includes("h-4") ? 16 : 20 }}
          >
            {/* Half-star overlay */}
            {halfFilled && (
              <Star
                className={cn(sizes[size], "absolute inset-0 fill-[#facc15] text-[#facc15]")}
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            )}
            {/* Full or empty star */}
            <Star
              className={cn(
                sizes[size],
                "transition-colors",
                filled
                  ? "fill-[#facc15] text-[#facc15]"
                  : "fill-transparent text-[rgba(183,148,212,0.30)]"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

interface RatingRowProps {
  label: string
  value: number
  count?: number
  size?: "sm" | "md"
}

export function RatingRow({ label, value, count, size = "md" }: RatingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <StarRating value={value} size="sm" />
        <span className="text-xs font-semibold tabular-nums w-6 text-right">{value.toFixed(1)}</span>
      </div>
    </div>
  )
}
