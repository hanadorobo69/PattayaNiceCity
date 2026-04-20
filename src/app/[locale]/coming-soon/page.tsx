import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Coming Soon - Pattaya Nice City",
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <p className="text-6xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
        NICE IS COMING
      </p>
      <p className="text-muted-foreground text-sm max-w-sm">
        We're building the ultimate family-friendly guide to Pattaya.
        Restaurants, beaches, activities, temples & more - all in one place.
      </p>
      <div className="h-[3px] w-[120px] rounded-full bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] animate-pulse" />
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="text-center">
          <span className="text-2xl">🏖️</span>
          <p className="text-[11px] text-muted-foreground mt-1">Beaches</p>
        </div>
        <div className="text-center">
          <span className="text-2xl">🍜</span>
          <p className="text-[11px] text-muted-foreground mt-1">Restaurants</p>
        </div>
        <div className="text-center">
          <span className="text-2xl">🎡</span>
          <p className="text-[11px] text-muted-foreground mt-1">Activities</p>
        </div>
      </div>
    </div>
  )
}
