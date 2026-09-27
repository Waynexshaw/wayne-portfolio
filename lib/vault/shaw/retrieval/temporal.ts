/**
 * Waynex Vault — Temporal Expression Resolver
 *
 * Provides deterministic calendar and rolling window resolution for queries:
 * - "today": current calendar day [00:00:00, 23:59:59]
 * - "yesterday": previous calendar day [00:00:00, 23:59:59]
 * - "this_week": current calendar week (Monday 00:00:00 to Sunday 23:59:59)
 * - "last_week": previous calendar week (prior Monday 00:00:00 to prior Sunday 23:59:59)
 * - "last_7_days": rolling 7-day window ending now
 * - "last_30_days": rolling 30-day window ending now
 */

import { TemporalExpression, TemporalWindow } from './types'

function formatDateToIsoString(d: Date): string {
  return d.toISOString()
}

function formatDateToDateString(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveTemporalWindow(
  expression: TemporalExpression,
  anchorDate: Date = new Date()
): TemporalWindow {
  const current = new Date(anchorDate.getTime())
  
  let start: Date
  let end: Date
  let label: string

  switch (expression) {
    case 'today': {
      start = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), 0, 0, 0, 0))
      end = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), 23, 59, 59, 999))
      label = `Today (${formatDateToDateString(start)})`
      break
    }

    case 'yesterday': {
      const yDay = new Date(current.getTime() - 24 * 60 * 60 * 1000)
      start = new Date(Date.UTC(yDay.getUTCFullYear(), yDay.getUTCMonth(), yDay.getUTCDate(), 0, 0, 0, 0))
      end = new Date(Date.UTC(yDay.getUTCFullYear(), yDay.getUTCMonth(), yDay.getUTCDate(), 23, 59, 59, 999))
      label = `Yesterday (${formatDateToDateString(start)})`
      break
    }

    case 'this_week': {
      // ISO week: Monday is day 1, Sunday is day 7 (getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat)
      const dayOfWeek = current.getUTCDay()
      const distanceToMonday = (dayOfWeek + 6) % 7
      const monday = new Date(current.getTime() - distanceToMonday * 24 * 60 * 60 * 1000)
      start = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0))
      
      const sunday = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
      end = new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 23, 59, 59, 999))
      label = `This Week (${formatDateToDateString(start)} to ${formatDateToDateString(sunday)})`
      break
    }

    case 'last_week': {
      // Prior calendar week: Monday of previous week to Sunday of previous week
      const dayOfWeek = current.getUTCDay()
      const distanceToMonday = (dayOfWeek + 6) % 7
      const thisMonday = new Date(current.getTime() - distanceToMonday * 24 * 60 * 60 * 1000)
      const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      start = new Date(Date.UTC(lastMonday.getUTCFullYear(), lastMonday.getUTCMonth(), lastMonday.getUTCDate(), 0, 0, 0, 0))
      const lastSunday = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
      end = new Date(Date.UTC(lastSunday.getUTCFullYear(), lastSunday.getUTCMonth(), lastSunday.getUTCDate(), 23, 59, 59, 999))
      label = `Last Week (${formatDateToDateString(start)} to ${formatDateToDateString(lastSunday)})`
      break
    }

    case 'last_7_days': {
      // Rolling 7-day window ending now
      end = new Date(current.getTime())
      start = new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000)
      label = `Last 7 Rolling Days (${formatDateToDateString(start)} to ${formatDateToDateString(end)})`
      break
    }

    case 'last_30_days': {
      end = new Date(current.getTime())
      start = new Date(current.getTime() - 30 * 24 * 60 * 60 * 1000)
      label = `Last 30 Rolling Days (${formatDateToDateString(start)} to ${formatDateToDateString(end)})`
      break
    }

    default: {
      end = new Date(current.getTime())
      start = new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000)
      label = `Rolling Window (${formatDateToDateString(start)} to ${formatDateToDateString(end)})`
    }
  }

  return {
    type: expression,
    label,
    start,
    end,
    startIso: formatDateToIsoString(start),
    endIso: formatDateToIsoString(end),
    startDateString: formatDateToDateString(start),
    endDateString: formatDateToDateString(end),
  }
}

/**
 * Extracts temporal expression from user prompt if present
 */
export function extractTemporalExpression(prompt: string): TemporalExpression | null {
  const p = prompt.toLowerCase()
  if (/\blast\s+7\s+days\b|\bpast\s+7\s+days\b|\bseven\s+days\b/.test(p)) {
    return 'last_7_days'
  }
  if (/\blast\s+week\b|\bprevious\s+week\b|\bpast\s+week\b/.test(p)) {
    return 'last_week'
  }
  if (/\bthis\s+week\b|\bcurrent\s+week\b/.test(p)) {
    return 'this_week'
  }
  if (/\byesterday\b/.test(p)) {
    return 'yesterday'
  }
  if (/\btoday\b|\bcurrent\s+day\b/.test(p)) {
    return 'today'
  }
  if (/\blast\s+30\s+days\b|\bpast\s+month\b|\blast\s+month\b/.test(p)) {
    return 'last_30_days'
  }
  return null
}
