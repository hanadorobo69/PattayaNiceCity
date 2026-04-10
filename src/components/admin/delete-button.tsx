"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { deletePost } from "@/actions/posts"
import { adminDeleteComment } from "@/actions/comments"
import { adminDeleteVenueComment } from "@/actions/venue-comments"
import { deleteVenue } from "@/actions/venues"
import { Trash2, AlertTriangle, X } from "lucide-react"

type DeleteType = "post" | "comment" | "venue-comment" | "venue"

interface DeleteButtonProps {
  id: string
  type: DeleteType
  itemName?: string
}

const actions: Record<DeleteType, (id: string) => Promise<any>> = {
  post: deletePost,
  comment: adminDeleteComment,
  "venue-comment": adminDeleteVenueComment,
  venue: deleteVenue,
}

export function DeleteButton({ id, type, itemName }: DeleteButtonProps) {
  const router = useRouter()
  const t = useTranslations("admin")
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await actions[type](id)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors"
        title={t("delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative bg-card border satine-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("confirmDelete")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {itemName
                    ? `${t("delete")} "${itemName}"? ${t("deleteWarning")}`
                    : t("deleteWarning")}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(61,184,160,0.20)] bg-[rgba(61,184,160,0.04)] text-[rgba(61,184,160,0.70)] hover:bg-[rgba(61,184,160,0.12)] hover:text-[#3db8a0] transition-all"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isPending ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
