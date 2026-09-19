export default function ProjectsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Top Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-64 bg-muted/60 rounded-md" />
            <div className="h-5 w-16 bg-muted/40 rounded-full" />
          </div>
          <div className="h-4 w-96 bg-muted/30 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-muted/50 rounded-lg shrink-0" />
      </div>

      {/* Projects Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-card border border-border space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-5 w-44 bg-muted/60 rounded" />
              <div className="h-4 w-16 bg-muted/40 rounded" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-3.5 w-full bg-muted/30 rounded" />
              <div className="h-3.5 w-3/4 bg-muted/30 rounded" />
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="h-3.5 w-24 bg-muted/40 rounded" />
              <div className="h-3.5 w-20 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
