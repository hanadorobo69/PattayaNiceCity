export function SunsetBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>

      {/* ── Fond noir absolu ── */}
      <div className="absolute inset-0 bg-[#0a0714] night-base" />

      {/* ── Background image - mode nuit ── */}
      <div
        className="absolute inset-0 night-base"
        style={{
          backgroundImage: "url('/assets/background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.05,
          mixBlendMode: "screen",
        }}
      />

      {/* ── Background image - mode jour uniquement ── */}
      <div
        className="absolute inset-0 hidden"
        style={{ backgroundImage: "url('/assets/white_theme/background_white.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", opacity: 0.05 }}
        id="bg-white-theme"
      />

      {/* ══════════════════════════════════════════
          ORBE ROSE - centre écran, respire en 5s
          scale 0.35 → 2.0 : part d'un point, explose
      ══════════════════════════════════════════ */}
      <div
        className="neon-orb neon-orb-pink"
        style={{
          top: "50%",
          left: "50%",
          width: 1400,
          height: 1400,
          marginTop: -700,
          marginLeft: -700,
          background: "radial-gradient(circle, rgba(232,168,64,0.55) 0%, rgba(232,168,64,0.22) 25%, rgba(232,168,64,0.08) 55%, rgba(232,168,64,0.02) 75%, transparent 90%)",
        }}
      />

      <div
        className="neon-orb neon-orb-cyan"
        style={{
          top: "50%",
          left: "50%",
          width: 1600,
          height: 1600,
          marginTop: -800,
          marginLeft: -800,
          background: "radial-gradient(circle, rgba(61,184,160,0.45) 0%, rgba(61,184,160,0.18) 25%, rgba(61,184,160,0.06) 55%, rgba(61,184,160,0.01) 75%, transparent 90%)",
        }}
      />

      <div
        className="neon-orb neon-orb-purple"
        style={{
          top: "35%",
          left: "65%",
          width: 1200,
          height: 1200,
          marginTop: -600,
          marginLeft: -600,
          background: "radial-gradient(circle, rgba(224,120,80,0.50) 0%, rgba(224,120,80,0.20) 25%, rgba(224,120,80,0.06) 55%, transparent 85%)",
          animationDelay: "-2s",
        }}
      />

      <div
        className="neon-orb neon-orb-orange"
        style={{
          top: "70%",
          left: "25%",
          width: 1000,
          height: 1000,
          marginTop: -500,
          marginLeft: -500,
          background: "radial-gradient(circle, rgba(255,159,67,0.40) 0%, rgba(255,159,67,0.15) 25%, rgba(255,159,67,0.04) 55%, transparent 85%)",
          animationDelay: "-1s",
        }}
      />

      {/* ── Scanlines horizontales animées ── */}
      <div
        className="neon-scanlines absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 38px, rgba(232,168,64,0.03) 39px, rgba(232,168,64,0.03) 40px)",
        }}
      />

      {/* ── Skyline silhouette ── */}
      <div className="absolute bottom-0 left-0 right-0 h-28 opacity-25 skyline">
        <svg
          className="w-full h-full"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          fill="#1a1510"
        >
          <path d="M0 100 L0 70 L50 70 L50 50 L80 50 L80 60 L120 60 L120 40 L150 40 L150 55 L180 55 L180 30 L200 30 L200 60 L250 60 L250 45 L280 45 L280 65 L320 65 L320 35 L350 35 L350 50 L400 50 L400 25 L430 25 L430 55 L480 55 L480 40 L520 40 L520 60 L560 60 L560 20 L590 20 L590 45 L640 45 L640 55 L680 55 L680 35 L720 35 L720 50 L760 50 L760 30 L800 30 L800 55 L850 55 L850 45 L890 45 L890 60 L940 60 L940 40 L980 40 L980 50 L1020 50 L1020 35 L1060 35 L1060 55 L1100 55 L1100 45 L1150 45 L1150 60 L1200 60 L1200 100 Z" />
        </svg>
      </div>

      {/* Reflet neon sous la skyline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 opacity-40"
        style={{ background: "linear-gradient(to top, rgba(232,168,64,0.15), transparent)" }}
      />

      {/* ── Palmiers ── */}
      <svg className="absolute bottom-0 left-0 w-44 h-64 opacity-35 skyline" viewBox="0 0 100 150" fill="#0a0515">
        <path d="M50 150 L50 80 Q45 75 30 60 Q15 45 5 35 Q20 50 50 75 Q35 60 20 45 Q35 65 50 75 Q55 60 65 45 Q75 30 85 20 Q70 45 50 75 Q65 55 85 40 Q65 60 50 75 L50 150" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-36 h-56 opacity-25 skyline" viewBox="0 0 100 150" fill="#0a0515">
        <path d="M50 150 L50 90 Q45 85 35 70 Q25 55 20 45 Q30 55 50 80 Q40 70 30 55 Q40 70 50 80 Q55 70 62 55 Q70 40 75 30 Q65 50 50 80 Q60 65 75 50 Q60 70 50 80 L50 150" />
      </svg>

    </div>
  )
}
