export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0015] via-[#1a0f2e] to-[#0a0a2e] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff2d95]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00f5ff]/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#8a2be2]/10 rounded-full blur-[100px]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <h1 className="text-5xl sm:text-7xl font-bold mb-6">
          <span className="bg-gradient-to-r from-[#ff2d95] via-[#8a2be2] to-[#00f5ff] bg-clip-text text-transparent">
            Pattaya Nice City
          </span>
        </h1>

        <div className="mb-8">
          <p className="text-2xl sm:text-3xl font-light text-white/80 tracking-wide">
            Coming Soon
          </p>
          <div className="mt-4 h-1 w-24 mx-auto bg-gradient-to-r from-[#ff2d95] via-[#8a2be2] to-[#00f5ff] rounded-full" />
        </div>

        <p className="text-white/40 text-sm max-w-md mx-auto">
          Something exciting is being built. Stay tuned.
        </p>
      </div>
    </div>
  );
}
