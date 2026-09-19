export default function WorkbenchLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-16">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-28 bg-muted/40 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <div className="h-4 w-36 bg-muted/50 rounded" />
      </div>

      {/* Workbench Header Card skeleton */}
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-muted/60 rounded-md" />
          <div className="h-4 w-80 bg-muted/40 rounded" />
          <div className="flex items-center gap-3 pt-1">
            <div className="h-3 w-16 bg-muted/40 rounded" />
            <div className="h-3 w-16 bg-muted/40 rounded" />
            <div className="h-3 w-16 bg-muted/40 rounded" />
          </div>
        </div>

        {/* Primary Action Buttons skeleton */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 w-28 bg-muted/60 rounded-lg" />
          <div className="h-8 w-24 bg-muted/50 rounded-lg" />
          <div className="h-8 w-24 bg-muted/50 rounded-lg" />
          <div className="h-8 w-24 bg-muted/50 rounded-lg" />
        </div>
      </div>

      {/* Controls & Filter Bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="h-8 w-72 bg-muted/40 rounded-lg" />
        <div className="h-8 w-60 bg-muted/40 rounded-lg" />
      </div>

      {/* Artifacts List skeleton */}
      <div className="space-y-2.5">
        <div className="h-4 w-24 bg-muted/50 rounded" />
        <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-muted/50 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-48 bg-muted/60 rounded" />
                  <div className="h-3 w-32 bg-muted/30 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 bg-muted/40 rounded-md" />
                <div className="h-7 w-7 bg-muted/40 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
