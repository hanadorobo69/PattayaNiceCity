import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Coming Soon - Pattaya Nice City",
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1510] px-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgba(232,168,64,0.08)] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(61,184,160,0.06)] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(224,120,80,0.04)] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg space-y-8">
        {/* Logo / Brand */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black font-[family-name:var(--font-orbitron)] tracking-tight">
            <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
              Pattaya
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#3db8a0] via-[#e07850] to-[#e8a840] bg-clip-text text-transparent">
              Nice City
            </span>
          </h1>
        </div>

        {/* Coming soon message */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(232,168,64,0.12)] border border-[rgba(232,168,64,0.25)]">
            <span className="h-2 w-2 rounded-full bg-[#e8a840] animate-pulse" />
            <span className="text-sm font-medium text-[#e8a840]">Under Construction</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white/90">
            Something nice is coming...
          </h2>
          <p className="text-white/50 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            We're building the ultimate family-friendly guide to Pattaya.
            Restaurants, beaches, activities, temples, parks and much more -
            all in one place.
          </p>
        </div>

        {/* Features teaser */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl bg-[rgba(232,168,64,0.08)] border border-[rgba(232,168,64,0.15)] p-3 space-y-1">
            <span className="text-2xl">🏖️</span>
            <p className="text-[11px] text-white/60 font-medium">Beaches</p>
          </div>
          <div className="rounded-xl bg-[rgba(224,120,80,0.08)] border border-[rgba(224,120,80,0.15)] p-3 space-y-1">
            <span className="text-2xl">🍜</span>
            <p className="text-[11px] text-white/60 font-medium">Restaurants</p>
          </div>
          <div className="rounded-xl bg-[rgba(61,184,160,0.08)] border border-[rgba(61,184,160,0.15)] p-3 space-y-1">
            <span className="text-2xl">🎡</span>
            <p className="text-[11px] text-white/60 font-medium">Activities</p>
          </div>
        </div>

        {/* Admin login link */}
        <div className="pt-6">
          <Link
            href="/login"
            className="text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Admin access
          </Link>
        </div>
      </div>
    </div>
  )
}
