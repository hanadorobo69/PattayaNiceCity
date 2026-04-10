import { BadgeCheck } from "lucide-react"

interface VerifiedBadgeProps {
  size?: "sm" | "md"
  label?: string
}

export function VerifiedBadge({ size = "sm", label = "Verified" }: VerifiedBadgeProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <span className={`inline-flex items-center gap-1 text-primary font-medium ${textSize}`} title={label}>
      <BadgeCheck className={`${iconSize} fill-[rgba(232,168,64,0.20)]`} />
      {label}
    </span>
  )
}
