export default function VaultLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2 pb-6 border-b border-border">
        <div className="h-7 w-48 bg-muted/60 rounded-md" />
        <div className="h-4 w-72 bg-muted/40 rounded-md" />
      </div>

      {/* Quick stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl bg-card border border-border space-y-3">
            <div className="h-3.5 w-24 bg-muted/50 rounded" />
            <div className="h-7 w-16 bg-muted/70 rounded" />
            <div className="h-3 w-32 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="h-5 w-40 bg-muted/60 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="h-5 w-32 bg-muted/60 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
