import { ConditionGroup, ConditionPredicate, ConditionOperator } from './types'

const VALID_OPERATORS: Set<ConditionOperator> = new Set([
  'equals',
  'not_equals',
  'in',
  'not_in',
  'greater_than',
  'less_than',
  'is_null',
  'is_not_null',
])

/**
 * Safely extracts a field from a payload object using dot-notation.
 */
export function getFieldValue(record: Record<string, any>, path: string): any {
  if (!record || typeof record !== 'object') return undefined
  if (!path) return undefined

  const parts = path.split('.')
  let current: any = record
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

/**
 * Evaluates a single predicate against the record data.
 */
export function evaluatePredicate(predicate: ConditionPredicate, record: Record<string, any>): boolean {
  if (!predicate || typeof predicate !== 'object') return false
  if (!predicate.field || typeof predicate.field !== 'string') return false
  if (!VALID_OPERATORS.has(predicate.operator)) return false

  const actualValue = getFieldValue(record, predicate.field)
  const targetValue = predicate.value

  switch (predicate.operator) {
    case 'equals':
      return actualValue === targetValue
    case 'not_equals':
      return actualValue !== targetValue
    case 'in':
      if (!Array.isArray(targetValue)) return false
      return targetValue.includes(actualValue)
    case 'not_in':
      if (!Array.isArray(targetValue)) return false
      return !targetValue.includes(actualValue)
    case 'greater_than':
      if (actualValue === null || actualValue === undefined || targetValue === null || targetValue === undefined) {
        return false
      }
      return actualValue > targetValue
    case 'less_than':
      if (actualValue === null || actualValue === undefined || targetValue === null || targetValue === undefined) {
        return false
      }
      return actualValue < targetValue
    case 'is_null':
      return actualValue === null || actualValue === undefined
    case 'is_not_null':
      return actualValue !== null && actualValue !== undefined
    default:
      return false
  }
}

/**
 * Normalizes and validates a condition group.
 * Empty predicates array always evaluates to true (no conditions).
 */
export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  record: Record<string, any>
): boolean {
  if (!group || typeof group !== 'object') return true
  if (!group.predicates || !Array.isArray(group.predicates) || group.predicates.length === 0) {
    return true
  }

  const conjunction = group.conjunction === 'OR' ? 'OR' : 'AND'

  if (conjunction === 'AND') {
    for (const predicate of group.predicates) {
      if (!evaluatePredicate(predicate, record)) {
        return false
      }
    }
    return true
  } else {
    // OR
    for (const predicate of group.predicates) {
      if (evaluatePredicate(predicate, record)) {
        return true
      }
    }
    return false
  }
}
