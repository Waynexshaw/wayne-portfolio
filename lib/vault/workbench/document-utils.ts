// lib/vault/workbench/document-utils.ts

/**
 * Recursively extracts plain text from a TipTap / ProseMirror JSON document node.
 */
export function extractPlainTextFromTipTap(node: any): string {
  if (!node) return ''

  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text
  }

  if (Array.isArray(node.content)) {
    const parts = node.content.map(extractPlainTextFromTipTap)
    // Add line break between block nodes
    if (node.type === 'paragraph' || (typeof node.type === 'string' && node.type.startsWith('heading')) || node.type === 'blockquote') {
      return parts.join('') + '\n'
    }
    return parts.join('')
  }

  return ''
}

/**
 * Generates a clean plain text preview snippet (up to maxLength characters).
 */
export function getDocumentSnippet(plainText: string, maxLength: number = 160): string {
  const cleaned = plainText.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength) + '...'
}