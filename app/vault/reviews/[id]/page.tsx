import Link from 'next/link'
import { ArrowLeft, RotateCcw, Database } from 'lucide-react'
import { getVaultContext, getReviewDetail } from '@/lib/vault/actions'
import { ReviewDetailView } from '@/components/vault/review/review-detail-view'

export const dynamic = 'force-dynamic'

interface ReviewDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  let review: any = null
  let dbError: string | null = null

  try {
    review = await getReviewDetail(id, activeWorkspace?.id)
  } catch (err: any) {
    console.error('[Vault Review Detail Error]:', err?.message || err)
    dbError = 'Database query failure encountered while loading review details.'
  }

  if (dbError) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive shadow-sm">
          <Database className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-foreground">
            System Error
          </h2>
          <p className="text-xs text-muted-foreground">
            A database error occurred while retrieving this review. This may indicate a pending schema migration or connection issue.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/reviews"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Reviews Directory
          </Link>
        </div>
      </div>
    )
  }

  if (!review || !activeWorkspace?.id) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-muted-foreground shadow-sm">
          <RotateCcw className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-foreground">
            Review Not Found
          </h2>
          <p className="text-xs text-muted-foreground">
            This review does not exist, has been removed, or belongs to another workspace.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/reviews"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Reviews Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ReviewDetailView
      review={review}
      workspaceId={activeWorkspace.id}
      workspaceName={activeWorkspace.name}
    />
  )
}
