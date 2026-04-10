"use client"

import { useTranslations } from "next-intl"
import { getKarmaTier, getNextTier } from "@/lib/karma"
import { AdminBadge } from "@/components/ui/admin-badge"

interface KarmaBadgeProps {
  karma: number
  showPoints?: boolean
  size?: "sm" | "md"
  isAdmin?: boolean
}

const TIER_LABEL_KEYS: Record<string, string> = {
  Lurker: "lurker",
  Tourist: "tourist",
  Regular: "regular",
  Local: "local",
  OG: "og",
  Legend: "legend",
}

export function KarmaBadge({ karma, showPoints = false, size = "sm", isAdmin = false }: KarmaBadgeProps) {
  const t = useTranslations("karma")
  if (isAdmin) return <AdminBadge />

  const tier = getKarmaTier(karma)
  const labelKey = TIER_LABEL_KEYS[tier.label] ?? tier.label

  const sizeClasses = size === "sm"
    ? "text-xs px-1.5 py-0.5 gap-1"
    : "text-sm px-2.5 py-1 gap-1.5"

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses}`}
      style={{
        backgroundColor: tier.color + "22",
        color: tier.color,
        border: `1px solid ${tier.color}44`,
      }}
      title={`${tier.description} - ${karma} karma pts`}
    >
      <span>{tier.emoji}</span>
      <span>{t(labelKey)}</span>
      {showPoints && <span className="opacity-60 font-normal">· {karma}</span>}
    </span>
  )
}

interface KarmaProgressProps {
  karma: number
}

export function KarmaProgress({ karma }: KarmaProgressProps) {
  const t = useTranslations("karma")
  const tier = getKarmaTier(karma)
  const next = getNextTier(karma)

  const progress = next
    ? Math.round(((karma - tier.min) / (next.min - tier.min)) * 100)
    : 100

  const nextLabelKey = next ? (TIER_LABEL_KEYS[next.label] ?? next.label) : ""

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <KarmaBadge karma={karma} showPoints size="md" />
        {next && (
          <span className="text-xs text-muted-foreground">
            {next.min - karma} pts until {next.emoji} {t(nextLabelKey)}
          </span>
        )}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: tier.color,
            boxShadow: `0 0 8px ${tier.color}88`,
          }}
        />
      </div>
    </div>
  )
}
