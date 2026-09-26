export default function AutomationsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-16">
      {/* Automations Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-48 bg-muted/60 rounded-md" />
            <div className="h-5 w-24 bg-muted/40 rounded-full" />
          </div>
          <div className="h-4 w-72 bg-muted/30 rounded-md" />
        </div>
        <div className="h-9 w-40 bg-muted/50 rounded-lg shrink-0" />
      </div>

      {/* Tab Switcher skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="h-9 w-72 bg-muted/40 rounded-lg" />
        <div className="h-9 w-32 bg-muted/40 rounded-lg" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-56 bg-muted/60 rounded" />
                <div className="h-4 w-20 bg-muted/40 rounded-full" />
              </div>
              <div className="h-3.5 w-96 bg-muted/30 rounded" />
              <div className="flex items-center gap-4">
                <div className="h-3 w-32 bg-muted/40 rounded" />
                <div className="h-3 w-28 bg-muted/40 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-8 w-20 bg-muted/50 rounded-lg" />
              <div className="h-8 w-24 bg-muted/60 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
