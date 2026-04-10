"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { submitRating } from "@/actions/ratings"
import { getCriteriaForCategory } from "@/lib/rating-criteria"
import { StarRating } from "./star-rating"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Pencil, CheckCircle } from "lucide-react"

interface RatingFormProps {
  postId: string
  categorySlug: string
  existingRating?: {
    overall: number
    scores: Record<string, number>
    comment: string | null
  } | null
  onSuccess?: () => void
}

export function RatingForm({ postId, categorySlug, existingRating, onSuccess }: RatingFormProps) {
  const { toast } = useToast()
  const t = useTranslations("rating")
  const tc = useTranslations("common")
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(!existingRating)
  const [comment, setComment] = useState(existingRating?.comment ?? "")
  const [ratings, setRatings] = useState<Record<string, number>>(
    existingRating ? { ...existingRating.scores, overall: existingRating.overall } : {}
  )

  const criteria = getCriteriaForCategory(categorySlug)
  const requiredKeys = [...criteria.filter(c => c.required).map(c => c.key), "overall"]
  const isValid = requiredKeys.every(k => (ratings[k] ?? 0) >= 1)

  function handleSubmit() {
    if (!isValid) return
    const { overall, ...scores } = ratings
    startTransition(async () => {
      const result = await submitRating({
        postId,
        categorySlug,
        overall: overall ?? 0,
        scores,
        comment: comment || undefined,
      })
      if (result.success) {
        toast({ title: existingRating ? t("ratingUpdated") : t("ratingSubmitted"), description: t("thanksForReview") })
        setIsEditing(false)
        onSuccess?.()
      } else {
        toast({ title: tc("error"), description: result.error, variant: "destructive" })
      }
    })
  }

  // Already rated - show summary with edit button
  if (existingRating && !isEditing) {
    return (
      <div className="rounded-xl border satine-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span>{t("yourRating")} - <span className="text-primary">{existingRating.overall}/5</span></span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1 text-xs">
            <Pencil className="h-3 w-3" />
            {tc("edit")}
          </Button>
        </div>
        {existingRating.comment && (
          <p className="text-sm text-muted-foreground italic">"{existingRating.comment}"</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border satine-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {existingRating ? t("updateYourRating") : t("rateThisPlace")}
        </h3>
        {existingRating && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground">
            {tc("cancel")}
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        {criteria.map(({ key, label, required, description }) => (
          <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <span className="text-sm text-muted-foreground">
                {label}
                {!required && <span className="text-xs ml-1 opacity-40">{t("optional")}</span>}
              </span>
              {description && (
                <p className="text-xs text-[rgba(183,148,212,0.50)] truncate">{description}</p>
              )}
            </div>
            <div className="shrink-0 flex justify-end w-[90px]">
              <StarRating
                value={ratings[key] ?? 0}
                interactive
                size="sm"
                onChange={(v) => setRatings(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          </div>
        ))}

        {/* Overall - always last */}
        <div className="pt-2 border-t border-border grid grid-cols-[1fr_auto] items-center gap-3">
          <span className="text-sm font-semibold">{t("overall")}</span>
          <div className="shrink-0 flex justify-end w-[90px]">
            <StarRating
              value={ratings.overall ?? 0}
              interactive
              size="sm"
              onChange={(v) => setRatings(prev => ({ ...prev, overall: v }))}
            />
          </div>
        </div>
      </div>

      <Textarea
        placeholder={t("shareExperiencePlaceholder")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="resize-none text-sm"
      />

      <Button onClick={handleSubmit} disabled={!isValid || isPending} size="sm" className="w-full">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? t("saving") : existingRating ? t("updateRating") : t("submitRating")}
      </Button>
    </div>
  )
}
