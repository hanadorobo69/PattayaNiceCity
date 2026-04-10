"use client"

import { useState, useTransition } from "react"
import { Link } from "@/i18n/navigation"
import { LogOut, MessageCircle, Trash2 } from "lucide-react"
import { UnreadBadge } from "@/components/messages/unread-badge"
import { useTranslations } from "next-intl"

interface ProfileActionsProps {
  signOutAction: () => Promise<void>
  deleteAccountAction: () => Promise<{ success: boolean; error?: string } | void>
  isAdmin: boolean
}

export function ProfileActions({ signOutAction, deleteAccountAction, isAdmin }: ProfileActionsProps) {
  const t = useTranslations("profile")
  const tHeader = useTranslations("header")
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteAccountAction()
      if (result && !result.success) {
        setError(result.error || "An error occurred")
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/messages"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(61,184,160,0.08)] border border-[rgba(61,184,160,0.25)] text-[#3db8a0] hover:bg-[rgba(61,184,160,0.15)] transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Messages
          <UnreadBadge />
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(232,168,64,0.08)] border border-[rgba(232,168,64,0.25)] text-[#e8a840] hover:bg-[rgba(232,168,64,0.15)] transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {tHeader("signOut")}
          </button>
        </form>
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.15)] transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            {t("deleteAccount")}
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-card border satine-border rounded-2xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-destructive">{t("deleteAccountTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("deleteAccountWarning")}</p>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("deleteAccountConfirmLabel")}</label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                style={{ background: "var(--input)", border: "1px solid var(--border)" }}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(""); setError(null) }}
                className="px-4 py-2 rounded-xl text-sm font-medium border satine-border hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? t("deleting") : t("confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
