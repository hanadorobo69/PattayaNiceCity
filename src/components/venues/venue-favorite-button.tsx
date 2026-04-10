"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Heart } from "lucide-react"
import { toggleVenueFavorite } from "@/actions/venue-favorites"
import { useToast } from "@/components/ui/use-toast"

interface VenueFavoriteButtonProps {
  venueId: string
  venueSlug: string
  initialFavorited: boolean
  isAuthenticated: boolean
}

export function VenueFavoriteButton({ venueId, venueSlug, initialFavorited, isAuthenticated }: VenueFavoriteButtonProps) {
  const t = useTranslations("venueFavorites")
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast({ title: t("signInRequired"), variant: "destructive" })
      return
    }
    setFavorited(!favorited)
    startTransition(async () => {
      const result = await toggleVenueFavorite(venueId, venueSlug)
      if (result.success) {
        setFavorited(result.data.favorited)
      } else {
        setFavorited(favorited)
        toast({ title: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center justify-center h-[3.25rem] w-[3.25rem] sm:h-[3.5rem] sm:w-[3.5rem] rounded-xl transition-all cursor-pointer border ${
        favorited
          ? "bg-[rgba(232,168,64,0.15)] border-[rgba(232,168,64,0.40)] text-[#e8a840]"
          : "bg-[rgba(75,35,120,0.20)] border-border text-muted-foreground hover:text-foreground hover:border-[rgba(232,168,64,0.30)]"
      } disabled:opacity-50`}
      title={t("save")}
    >
      <Heart className={`h-6 w-6 sm:h-7 sm:w-7 ${favorited ? "fill-current" : ""}`} />
    </button>
  )
}
