"use client"

import { useMemo } from "react"
import { analyzeSeo } from "@/lib/seo-utils"
import { CheckCircle, AlertTriangle, XCircle, BarChart3 } from "lucide-react"

interface SeoScorePanelProps {
  title: string
  metaTitle: string
  metaDescription: string
  content: string
  focusKeyword: string
  excerpt: string
}

export function SeoScorePanel(props: SeoScorePanelProps) {
  const checks = useMemo(() => analyzeSeo(props), [props.title, props.metaTitle, props.metaDescription, props.content, props.focusKeyword, props.excerpt])

  const good = checks.filter(c => c.status === "good").length
  const warnings = checks.filter(c => c.status === "warning").length
  const bad = checks.filter(c => c.status === "bad").length
  const total = checks.length
  // Weighted score: good = 100%, warning = 50%, bad = 0%
  const score = total > 0 ? Math.round(((good + warnings * 0.5) / total) * 100) : 0

  const scoreColor = score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400"
  const scoreBorder = score >= 70 ? "border-green-400/30" : score >= 40 ? "border-yellow-400/30" : "border-red-400/30"
  const barColor = score >= 70 ? "bg-green-400" : score >= 40 ? "bg-yellow-400" : "bg-red-400"
  const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs work" : "Poor"

  return (
    <div className={`rounded-2xl border ${scoreBorder} bg-card p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#3db8a0]" /> SEO Score
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{scoreLabel}</span>
          <span className={`text-lg font-bold ${scoreColor}`}>{score}/100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>

      {/* Summary counts */}
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" />{good} passed</span>
        <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle className="h-3 w-3" />{warnings} warnings</span>
        <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3 w-3" />{bad} issues</span>
      </div>

      <div className="space-y-1.5">
        {checks.map((check, i) => {
          const Icon = check.status === "good" ? CheckCircle : check.status === "warning" ? AlertTriangle : XCircle
          const color = check.status === "good" ? "text-green-400" : check.status === "warning" ? "text-yellow-400" : "text-red-400"
          return (
            <div key={i} className="flex items-start gap-2">
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <span className="text-xs font-medium text-foreground/90">{check.label}</span>
                <span className="text-xs text-muted-foreground ml-1.5">{check.detail}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
