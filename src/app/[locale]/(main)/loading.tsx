export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Feed tabs skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-16 rounded-md bg-muted" />
          ))}
        </div>
        <div className="h-8 w-20 rounded-md bg-muted" />
      </div>

      {/* Category bar skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-7 w-20 rounded-full bg-muted shrink-0" />
        ))}
      </div>

      {/* Post cards skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-[rgba(232,168,64,0.20)] bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
          </div>
          <div className="flex gap-4 pt-2">
            <div className="h-4 w-12 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
