"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { updateProfile } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { Loader2, Pencil, Upload, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { CountrySelect } from "@/components/ui/country-select"
import { EmojiPickerButton } from "@/components/ui/emoji-picker-button"

interface ProfileEditFormProps {
  profile: {
    displayName: string | null
    bio: string | null
    avatarUrl: string | null
    dateOfBirth: string | null
    nationality: string | null
    residentType: string | null
  }
}

// Shared input class for consistent styling
const inputBase =
  "flex h-10 w-full rounded-lg border border-[rgba(232,168,64,0.2)] bg-[rgba(26,21,16,0.6)] px-3 py-2 text-sm text-center text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:border-[rgba(232,168,64,0.5)] disabled:cursor-not-allowed disabled:opacity-50"

// ── Status Select (styled dropdown, same look as CountrySelect) ──
function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const ta = useTranslations("auth")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const options = [
    { value: "", label: ta("notSpecified") },
    { value: "tourist", label: ta("tourist") },
    { value: "expat", label: ta("resident") },
    { value: "digital_nomad", label: ta("digitalNomad") },
    { value: "local", label: ta("local") },
  ]

  const selected = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputBase} flex items-center justify-between cursor-pointer`}
      >
        <span className={value ? "text-foreground flex-1" : "text-muted-foreground flex-1"}>
          {selected.label}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[rgba(232,168,64,0.25)] bg-[rgba(36,28,20,0.98)] shadow-2xl p-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full text-center px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer ${
                opt.value === value
                  ? "bg-[rgba(232,168,64,0.12)] text-foreground"
                  : "text-muted-foreground hover:bg-[rgba(232,168,64,0.08)] hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Custom mini-dropdown for date parts ──
function MiniDropdown({
  value,
  placeholder,
  options,
  onChange,
  disabled,
}: {
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  // Scroll active item into view
  useEffect(() => {
    if (open && value && listRef.current) {
      const el = listRef.current.querySelector("[data-active='true']")
      if (el) el.scrollIntoView({ block: "nearest" })
    }
  }, [open, value])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputBase} flex items-center justify-center gap-1 cursor-pointer`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[rgba(232,168,64,0.25)] bg-[rgba(36,28,20,0.98)] shadow-2xl">
          <div ref={listRef} className="max-h-[180px] overflow-y-auto p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-active={opt.value === value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full text-center px-2 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                  opt.value === value
                    ? "bg-[rgba(232,168,64,0.12)] text-foreground"
                    : "text-muted-foreground hover:bg-[rgba(232,168,64,0.08)] hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Date of Birth Selects (day / month / year) ──
function DateOfBirthSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const ta = useTranslations("auth")

  const parts = value ? value.split("-") : ["", "", ""]
  const [year, setYear] = useState(parts[0] || "")
  const [month, setMonth] = useState(parts[1] || "")
  const [day, setDay] = useState(parts[2] || "")

  function update(y: string, m: string, d: string) {
    setYear(y)
    setMonth(m)
    setDay(d)
    if (y && m && d) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
    } else if (!y && !m && !d) {
      onChange("")
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i)
  const daysInMonth = month && year ? new Date(Number(year), Number(month), 0).getDate() : 31

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: String(i + 1),
  }))

  const monthOptions = monthNames.map((name, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: name,
  }))

  const yearOptions = years.map((y) => ({
    value: String(y),
    label: String(y),
  }))

  return (
    <div className="space-y-2">
      <Label className="text-xs">{ta("dateOfBirth")}</Label>
      <div className="flex gap-2">
        <MiniDropdown
          value={day}
          placeholder="DD"
          options={dayOptions}
          onChange={(v) => update(year, month, v)}
          disabled={disabled}
        />
        <MiniDropdown
          value={month}
          placeholder="MM"
          options={monthOptions}
          onChange={(v) => update(year, v, day)}
          disabled={disabled}
        />
        <MiniDropdown
          value={year}
          placeholder="YYYY"
          options={yearOptions}
          onChange={(v) => update(v, month, day)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// ── Main Component ──
export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter()
  const t = useTranslations("profile")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile.displayName ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "")
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "")
  const [nationality, setNationality] = useState(profile.nationality ?? "")
  const [residentType, setResidentType] = useState(profile.residentType ?? "")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lock body scroll when modal is open on mobile only
  useEffect(() => {
    if (!editing) return
    const isMobile = window.innerWidth < 640
    if (isMobile) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [editing])

  // Close on Escape
  useEffect(() => {
    if (!editing) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEditing(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [editing])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploadFd = new FormData()
      uploadFd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: uploadFd })
      const data = await res.json()
      if (!data.url) {
        setError(data.error || "Upload failed")
        return
      }
      setAvatarUrl(data.url)
      const saveFd = new FormData()
      saveFd.append("displayName", displayName)
      saveFd.append("bio", bio)
      saveFd.append("avatarUrl", data.url)
      saveFd.append("dateOfBirth", dateOfBirth)
      saveFd.append("nationality", nationality)
      saveFd.append("residentType", residentType)
      const result = await updateProfile(saveFd)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || "Failed to save avatar")
      }
    } catch {
      setError("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append("displayName", displayName)
      fd.append("bio", bio)
      fd.append("avatarUrl", avatarUrl)
      fd.append("dateOfBirth", dateOfBirth)
      fd.append("nationality", nationality)
      fd.append("residentType", residentType)
      const result = await updateProfile(fd)
      if (result.success) {
        setEditing(false)
        router.refresh()
      } else {
        setError(result.error || "Failed to update profile")
      }
    })
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] hover:shadow-[0_0_24px_rgba(232,168,64,0.5)] transition-all cursor-pointer"
      >
        <Pencil className="h-3.5 w-3.5" />
        {t("editProfile")}
      </button>
    )
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] text-red-400 text-sm rounded-md px-4 py-3 text-center">
          {error}
        </div>
      )}

      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3">
        {avatarUrl && (
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-[rgba(232,168,64,0.2)]"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? `${t("saving")}` : t("avatar")}
        </Button>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-xs">
          {t("displayName")}
        </Label>
        <input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("displayName")}
          disabled={isPending}
          className={inputBase}
        />
      </div>

      {/* Bio */}
      <div className="space-y-1">
        <Label htmlFor="bio" className="text-xs">
          {t("bio")}
        </Label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("bioPlaceholder")}
          rows={3}
          disabled={isPending}
          className="flex min-h-[80px] w-full rounded-lg border border-[rgba(232,168,64,0.2)] bg-[rgba(26,21,16,0.6)] px-3 py-2 text-sm text-center text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:border-[rgba(232,168,64,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <EmojiPickerButton onEmojiSelect={(emoji) => setBio(prev => prev + emoji)} />
      </div>

      {/* Nationality */}
      <div className="space-y-2">
        <Label className="text-xs">{ta("nationality")}</Label>
        <CountrySelect
          value={nationality}
          onChange={setNationality}
          placeholder={ta("nationalityPlaceholder")}
          disabled={isPending}
        />
      </div>

      {/* Date of Birth */}
      <DateOfBirthSelect
        value={dateOfBirth}
        onChange={setDateOfBirth}
        disabled={isPending}
      />

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-xs">{ta("status")}</Label>
        <StatusSelect
          value={residentType}
          onChange={setResidentType}
          disabled={isPending}
        />
      </div>

      {/* Buttons - centered */}
      <div className="flex gap-3 justify-center pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
          disabled={isPending}
          className="px-6"
        >
          {tc("cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="px-6">
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      {/* Mobile: fullscreen modal */}
      <div className="sm:hidden fixed inset-0 z-[100] flex flex-col bg-background">
        {/* Modal header */}
        <div className="px-4 py-3 border-b border-[rgba(232,168,64,0.15)]">
          <h3 className="text-base font-semibold text-center">{t("editProfile")}</h3>
        </div>
        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {formContent}
        </div>
      </div>

      {/* Desktop: inline card */}
      <div className="hidden sm:block rounded-xl border satine-border bg-[rgba(36,28,20,0.42)] p-5 w-full">
        <h3 className="text-sm font-semibold mb-4">{t("editProfile")}</h3>
        {formContent}
      </div>
    </>
  )
}
