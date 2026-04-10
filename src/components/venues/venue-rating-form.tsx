"use client"

import { useState, useTransition, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { submitVenueRating, addRatingComment } from "@/actions/venue-ratings"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Star, Loader2, Lock, RefreshCw, CheckCircle, X, MessageSquarePlus } from "lucide-react"
import { StarRating as StarRatingDisplay } from "@/components/posts/star-rating"
import type { RatingCriterion } from "@/lib/rating-criteria"

interface VenueRatingFormProps {
  venueId: string
  venueSlug: string
  categorySlug: string
  criteria: RatingCriterion[]
  isAuthenticated: boolean
  alreadyRated: boolean
  initialScores?: Record<string, number>
  initialOverall?: number
  flat?: boolean
}

function StarPicker({ value, onChange, size = "md" }: { value: number; onChange: (v: number) => void; size?: "sm" | "md" | "lg" }) {
  const [hovered, setHovered] = useState(0)
  const px = size === "lg" ? 28 : size === "md" ? 20 : 16
  const cls = size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-4 w-4"
  const active = hovered || value

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const full = active >= s
        const half = !full && active >= s - 0.5
        return (
          <div
            key={s}
            className="relative cursor-pointer focus:outline-none"
            style={{ width: px, height: px }}
            onMouseLeave={() => setHovered(0)}
          >
            {/* Left half - click for X.5 */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 z-10"
              onMouseEnter={() => setHovered(s - 0.5)}
              onClick={() => onChange(s - 0.5)}
            />
            {/* Right half - click for X */}
            <div
              className="absolute inset-y-0 right-0 w-1/2 z-10"
              onMouseEnter={() => setHovered(s)}
              onClick={() => onChange(s)}
            />
            {/* Half-star with clip */}
            {half && (
              <Star
                className={`${cls} absolute inset-0 transition-colors fill-[#facc15] text-[#facc15]`}
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            )}
            {/* Background / full star */}
            <Star
              className={`${cls} transition-colors ${
                full ? "fill-[#facc15] text-[#facc15]" : half ? "fill-transparent text-[#facc15]" : "fill-transparent text-[#6B7280]"
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Comment Modal ──
function CommentModal({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (comment: string) => void
  isPending: boolean
}) {
  const t = useTranslations("rating")
  const [comment, setComment] = useState("")

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-[rgba(232,168,64,0.25)] bg-card shadow-2xl shadow-[rgba(232,168,64,0.08)] animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[rgba(61,184,160,0.10)] flex items-center justify-center">
              <MessageSquarePlus className="h-5 w-5 text-[#3db8a0]" />
            </div>
            <div>
              <h3 className="font-semibold">{t("addComment")}</h3>
              <p className="text-xs text-muted-foreground">{t("shareExperienceOptional")}</p>
            </div>
          </div>

          {/* Textarea */}
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t("experiencePlaceholder")}
            rows={4}
            maxLength={500}
            className="resize-none"
            autoFocus
          />
          <div className="flex justify-end text-[10px] text-muted-foreground -mt-2">
            {comment.length}/500
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {t("skip")}
            </button>
            <Button
              size="sm"
              disabled={isPending || !comment.trim()}
              onClick={() => onSubmit(comment)}
            >
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {t("postComment")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function VenueRatingForm({
  venueId, venueSlug, categorySlug, criteria,
  isAuthenticated, alreadyRated, initialScores, initialOverall, flat
}: VenueRatingFormProps) {
  const { toast } = useToast()
  const t = useTranslations("rating")
  const tc = useTranslations("common")
  const [isPending, startTransition] = useTransition()
  const [isCommentPending, startCommentTransition] = useTransition()
  const [overall, setOverall] = useState(initialOverall ?? 0)
  const [overallManual, setOverallManual] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>(initialScores ?? {})
  const [editMode, setEditMode] = useState(!alreadyRated)
  const [submitted, setSubmitted] = useState(false)
  const [lastOverall, setLastOverall] = useState(initialOverall)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  function setScore(key: string, value: number) {
    const next = { ...scores, [key]: value }
    setScores(next)

    if (!overallManual) {
      const vals = Object.values(next).filter(v => v > 0)
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        setOverall(Math.round(avg * 2) / 2) // round to nearest 0.5
      }
    }
  }

  function handleOverallChange(v: number) {
    setOverall(v)
    setOverallManual(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (overall < 0.5) return

    const finalScores: Record<string, number> = {}
    for (const c of criteria) {
      if (scores[c.key]) finalScores[c.key] = scores[c.key]
    }

    startTransition(async () => {
      const result = await submitVenueRating(venueId, venueSlug, categorySlug, overall, finalScores)
      if (result.success) {
        toast({
          title: result.data.isUpdate ? t("ratingUpdated") : t("ratingSubmitted"),
          description: `Overall: ${result.data.overall}/5`,
        })
        setLastOverall(result.data.overall)
        setSubmitted(true)
        setEditMode(false)
        // Open comment modal after successful rating
        setShowCommentModal(true)
      } else {
        toast({ title: tc("error"), description: result.error, variant: "destructive" })
      }
    })
  }

  const handleCommentSubmit = useCallback((comment: string) => {
    startCommentTransition(async () => {
      const result = await addRatingComment(venueId, venueSlug, comment)
      if (result.success) {
        toast({ title: t("commentAdded"), description: t("thanksSharing") })
        setShowCommentModal(false)
      } else {
        toast({ title: tc("error"), description: result.error, variant: "destructive" })
      }
    })
  }, [venueId, venueSlug, toast])

  const handleCommentClose = useCallback(() => {
    setShowCommentModal(false)
  }, [])

  if (!isAuthenticated) {
    return (
      <div className={flat ? "flex items-center gap-3 text-muted-foreground" : "rounded-2xl border satine-border bg-card p-6 flex items-center gap-3 text-muted-foreground"}>
        <Lock className="h-4 w-4 shrink-0" />
        <p className="text-sm">
          <a href="/login" className="text-primary hover:underline font-medium">{tc("signIn")}</a> {t("loginToRate")}
        </p>
      </div>
    )
  }

  if ((alreadyRated || submitted) && !editMode) {
    return (
      <>
        <div className={flat ? "bg-card p-4 rounded-xl flex items-center justify-between gap-4" : "rounded-2xl border satine-border bg-card p-5 flex items-center justify-between gap-4"}>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">{t("yourRating")}</p>
              {lastOverall && (
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRatingDisplay value={lastOverall} size="sm" />
                  <span className="text-xs text-muted-foreground ml-1">{lastOverall}/5</span>
                </div>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditMode(true)
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
            }}
            className="shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("revote")}
          </Button>
        </div>

        <CommentModal
          open={showCommentModal}
          onClose={handleCommentClose}
          onSubmit={handleCommentSubmit}
          isPending={isCommentPending}
        />
      </>
    )
  }

  return (
    <div ref={formRef}>
      <form onSubmit={handleSubmit} className={flat ? "space-y-5" : "rounded-2xl border satine-border bg-card p-6 space-y-5"}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 fill-[#facc15] text-[#facc15]" />
            {(alreadyRated || submitted) ? t("updateYourRating") : t("rateThisVenue")}
          </h2>
          {(alreadyRated || submitted) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(false)} className="text-xs text-muted-foreground">
              {tc("cancel")}
            </Button>
          )}
        </div>

        {/* Overall - PRIMARY - at the top */}
        <div className="rounded-xl border border-[rgba(232,168,64,0.20)] bg-[rgba(232,168,64,0.05)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{t("overallRating")}</p>
              <p className="text-xs text-muted-foreground">
                {overallManual ? t("manuallySet") : Object.values(scores).some(v => v > 0) ? t("autoCalculated") : t("yourGlobalImpression")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StarPicker value={overall} onChange={handleOverallChange} size="lg" />
              {overall > 0 && <span className="text-sm font-bold text-[#facc15] ml-1">{overall}/5</span>}
            </div>
          </div>
        </div>

        {/* Detailed criteria - always visible */}
        <div className="space-y-2.5 pl-1">
          {criteria.map(c => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm">{c.label}</p>
                {c.description && <p className="text-[11px] text-muted-foreground">{c.description}</p>}
              </div>
              <StarPicker value={scores[c.key] ?? 0} onChange={(v) => setScore(c.key, v)} size="sm" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={isPending || overall < 0.5} size="sm">
            {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {(alreadyRated || submitted) ? t("updateRating") : t("submitRating")}
          </Button>
        </div>
      </form>

      <CommentModal
        open={showCommentModal}
        onClose={handleCommentClose}
        onSubmit={handleCommentSubmit}
        isPending={isCommentPending}
      />
    </div>
  )
}
