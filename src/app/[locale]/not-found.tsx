import { Link } from "@/i18n/navigation"

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center gap-6">
      <p className="text-6xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
        OOPS!?
      </p>
      <p className="text-muted-foreground text-sm max-w-xs">
        This page doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>
      <div className="h-[3px] w-[120px] rounded-full bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] animate-pulse" />
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white font-semibold text-sm hover:shadow-[0_0_24px_rgba(232,168,64,0.5)] transition-all"
      >
        Back to Home
      </Link>
    </div>
  )
}
