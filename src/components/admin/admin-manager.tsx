"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { createAdmin, removeAdmin } from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Crown, Trash2, Loader2, UserPlus } from "lucide-react"

interface Admin {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: Date
}

export function AdminManager({ admins, currentUserId }: { admins: Admin[]; currentUserId: string }) {
  const router = useRouter()
  const t = useTranslations("adminAdmins")
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleCreate(formData: FormData) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await createAdmin(formData)
      if (result.success) {
        setSuccess(t("adminCreated"))
        formRef.current?.reset()
        router.refresh()
      } else {
        setError(result.error ?? t("errorOccurred"))
      }
    })
  }

  function handleRemove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    setError(null)
    setSuccess(null)
    setConfirmId(null)
    startTransition(async () => {
      const result = await removeAdmin(id)
      if (result.success) {
        setSuccess(t("adminRemoved"))
        router.refresh()
      } else {
        setError(result.error ?? t("errorOccurred"))
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Current admins list */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("currentAdmins")}</span>
        </h2>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>{t("username")}</span>
          <span>{t("email")}</span>
          <span className="w-20 text-center">{t("action")}</span>
        </div>

        {/* Admin rows */}
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center p-3 rounded-lg glass-card"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0" />
                <span className="font-medium text-sm truncate">@{admin.username}</span>
              </div>
              <span className="text-sm text-muted-foreground truncate">{admin.email}</span>
              <div className="w-20 flex justify-center">
                {admin.id !== currentUserId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(admin.id)}
                    disabled={isPending}
                    className={confirmId === admin.id ? "text-red-500 hover:text-red-400" : "text-muted-foreground hover:text-red-500"}
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmId === admin.id && <span className="ml-1 text-xs">{t("confirm")}</span>}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("you")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] text-red-400 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.20)] text-green-400 text-sm rounded-md px-4 py-3">
          {success}
        </div>
      )}

      {/* Create new admin form */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-[family-name:var(--font-orbitron)] flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#e8a840]" />
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("createNewAdmin")}</span>
        </h2>
        <form ref={formRef} action={handleCreate} className="space-y-4 p-4 rounded-lg glass-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-username" className="text-xs">{t("username")}</Label>
              <Input
                id="admin-username"
                name="username"
                placeholder={t("username")}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs">{t("email")}</Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                placeholder={t("email")}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs">{t("password")}</Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                placeholder={t("password")}
                required
                minLength={8}
                disabled={isPending}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)]"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
            {t("createAdmin")}
          </Button>
        </form>
      </div>
    </div>
  )
}
