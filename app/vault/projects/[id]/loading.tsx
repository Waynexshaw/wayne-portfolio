export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-16">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-28 bg-muted/40 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <div className="h-4 w-40 bg-muted/50 rounded" />
      </div>

      {/* Project Overview Card skeleton */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-64 bg-muted/60 rounded-md" />
              <div className="h-5 w-18 bg-muted/40 rounded-full" />
            </div>
            <div className="h-4 w-80 bg-muted/30 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-muted/50 rounded-lg" />
            <div className="h-8 w-24 bg-muted/50 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Workbench Summary Card skeleton */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted/60 rounded" />
          <div className="h-8 w-32 bg-muted/50 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
              <div className="h-3 w-16 bg-muted/40 rounded" />
              <div className="h-6 w-8 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Operations Summary Card skeleton */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-44 bg-muted/60 rounded" />
          <div className="h-8 w-32 bg-muted/50 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
              <div className="h-3 w-20 bg-muted/40 rounded" />
              <div className="h-6 w-8 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
