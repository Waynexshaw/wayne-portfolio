import { MetricUnitType } from '@/lib/vault/actions'

export function formatMetricValue(
  val: number | null | undefined,
  unitType: MetricUnitType,
  unitSymbol?: string | null
): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  const numVal = Number(val)

  if (unitType === 'currency') {
    const symbol = unitSymbol || 'USD'
    return `${symbol} ${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  if (unitType === 'percentage') {
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
  }
  if (unitType === 'duration') {
    const symbol = unitSymbol ? ` ${unitSymbol}` : ' days'
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol}`
  }
  if (unitType === 'score') {
    const symbol = unitSymbol || '/10'
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`
  }

  // count / numeric default
  const symbol = unitSymbol ? ` ${unitSymbol}` : ''
  return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol}`
}
