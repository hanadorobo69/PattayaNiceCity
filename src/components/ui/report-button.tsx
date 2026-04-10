"use client"

import { useState } from "react"
import { Flag, X, Loader2 } from "lucide-react"

const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "False or misleading information",
  "Illegal content",
  "Sexually explicit content",
  "Doxxing / private information",
  "Copyright violation",
  "Other",
] as const

interface ReportButtonProps {
  contentType: "post" | "comment" | "venue"
  contentId: string
}

export function ReportButton({ contentType, contentId }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!reason) return
    setSending(true)
    // Store report - for now we'll just POST to a simple endpoint
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId, reason, details }),
      })
    } catch {
      // Silently handle - report is best-effort
    }
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Flag className="h-3 w-3" />
        <span>Report received. Thank you.</span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        title="Report this content"
      >
        <Flag className="h-3 w-3" />
        <span>Report</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[rgba(36,28,20,0.98)] border border-[rgba(232,168,64,0.25)] rounded-2xl p-6 max-w-sm mx-4 space-y-4 shadow-2xl w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Report Content</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {REPORT_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[#e8a840]"
                  />
                  {r}
                </label>
              ))}
            </div>

            <textarea
              placeholder="Additional details (optional)"
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={2}
              className="w-full bg-[rgba(26,21,16,0.6)] border border-[rgba(232,168,64,0.2)] rounded-lg px-3 py-2 text-sm text-foreground focus:border-[#e8a840] outline-none resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-sm text-muted-foreground border border-[rgba(232,168,64,0.2)] rounded-lg py-2 hover:bg-[rgba(232,168,64,0.08)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || sending}
                className="flex-1 flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white rounded-lg py-2 disabled:opacity-50 cursor-pointer"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                Submit Report
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Reports are reviewed by our moderation team. Abuse of the reporting system may result in account restrictions.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
