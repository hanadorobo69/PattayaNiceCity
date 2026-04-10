export default function PlacesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-7 w-24 rounded-full bg-muted shrink-0" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="rounded-2xl border border-[rgba(232,168,64,0.20)] bg-card overflow-hidden">
            <div className="aspect-[16/10] bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-5 w-12 rounded-full bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
