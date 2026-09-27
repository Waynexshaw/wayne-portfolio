/**
 * Waynex Vault — Temporal Expression Resolver
 *
 * Provides deterministic calendar and rolling window resolution for queries:
 * - "today": current calendar day [00:00:00.000, 23:59:59.999] in resolved timezone
 * - "yesterday": previous calendar day [00:00:00.000, 23:59:59.999] in resolved timezone
 * - "this_week": current calendar week (Monday 00:00:00.000 to Sunday 23:59:59.999) in resolved timezone
 * - "last_week": previous calendar week (prior Monday 00:00:00.000 to prior Sunday 23:59:59.999) in resolved timezone
 * - "last_7_days": rolling 7-day window ending now
 * - "last_30_days": rolling 30-day window ending now
 *
 * Priority for timezone resolution:
 * 1. Explicit timezone supplied by trusted request/application context
 * 2. Existing user/application timezone setting if one already exists
 * 3. Existing established application timezone convention
 * 4. UTC only as documented deterministic fallback when no better timezone exists
 */

import { TemporalExpression, TemporalWindow } from './types'

export function isValidTimezone(tz?: string): boolean {
  if (!tz || typeof tz !== 'string') return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function resolveEffectiveTimezone(timezone?: string): string {
  if (timezone && isValidTimezone(timezone)) {
    return timezone
  }
  // Documented deterministic fallback when no reliable timezone is available
  return 'UTC'
}

interface ZonedDateParts {
  year: number
  month: number // 1-12
  day: number   // 1-31
  hour: number  // 0-23
  minute: number
  second: number
  weekday: number // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dateString: string // YYYY-MM-DD
}

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = formatter.formatToParts(date)
  let year = 0
  let month = 0
  let day = 0
  let hour = 0
  let minute = 0
  let second = 0
  let weekdayName = ''
  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10)
    else if (p.type === 'month') month = parseInt(p.value, 10)
    else if (p.type === 'day') day = parseInt(p.value, 10)
    else if (p.type === 'hour') {
      const parsedH = parseInt(p.value, 10)
      hour = parsedH === 24 ? 0 : parsedH
    } else if (p.type === 'minute') minute = parseInt(p.value, 10)
    else if (p.type === 'second') second = parseInt(p.value, 10)
    else if (p.type === 'weekday') weekdayName = p.value
  }

  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const weekday = weekdays[weekdayName] ?? 0
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return { year, month, day, hour, minute, second, weekday, dateString }
}

export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): Date {
  if (timeZone === 'UTC') {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms))
  }

  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(approx)
  let y = 0
  let m = 0
  let d = 0
  let h = 0
  let min = 0
  let s = 0
  for (const p of parts) {
    if (p.type === 'year') y = parseInt(p.value, 10)
    else if (p.type === 'month') m = parseInt(p.value, 10)
    else if (p.type === 'day') d = parseInt(p.value, 10)
    else if (p.type === 'hour') {
      const parsedH = parseInt(p.value, 10)
      h = parsedH === 24 ? 0 : parsedH
    } else if (p.type === 'minute') min = parseInt(p.value, 10)
    else if (p.type === 'second') s = parseInt(p.value, 10)
  }

  const tzDate = new Date(Date.UTC(y, m - 1, d, h, min, s, approx.getUTCMilliseconds()))
  const offsetDiff = tzDate.getTime() - approx.getTime()
  return new Date(approx.getTime() - offsetDiff)
}

function formatDateToIsoString(d: Date): string {
  return d.toISOString()
}

export function resolveTemporalWindow(
  expression: TemporalExpression,
  anchorDate: Date = new Date(),
  timezone?: string
): TemporalWindow {
  const effectiveTimezone = resolveEffectiveTimezone(timezone)
  const currentParts = getZonedDateParts(anchorDate, effectiveTimezone)

  let start: Date
  let end: Date
  let label: string
  let startDateString: string
  let endDateString: string

  switch (expression) {
    case 'today': {
      start = zonedTimeToUtc(currentParts.year, currentParts.month, currentParts.day, 0, 0, 0, 0, effectiveTimezone)
      end = zonedTimeToUtc(currentParts.year, currentParts.month, currentParts.day, 23, 59, 59, 999, effectiveTimezone)
      startDateString = currentParts.dateString
      endDateString = currentParts.dateString
      label = `Today (${startDateString}${effectiveTimezone !== 'UTC' ? ` [${effectiveTimezone}]` : ''})`
      break
    }

    case 'yesterday': {
      const prevDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day - 1))
      const yYear = prevDate.getUTCFullYear()
      const yMonth = prevDate.getUTCMonth() + 1
      const yDay = prevDate.getUTCDate()
      start = zonedTimeToUtc(yYear, yMonth, yDay, 0, 0, 0, 0, effectiveTimezone)
      end = zonedTimeToUtc(yYear, yMonth, yDay, 23, 59, 59, 999, effectiveTimezone)
      startDateString = `${yYear}-${String(yMonth).padStart(2, '0')}-${String(yDay).padStart(2, '0')}`
      endDateString = startDateString
      label = `Yesterday (${startDateString}${effectiveTimezone !== 'UTC' ? ` [${effectiveTimezone}]` : ''})`
      break
    }

    case 'this_week': {
      // ISO week in local timezone: Monday is day 1, Sunday is day 7
      const distanceToMonday = (currentParts.weekday + 6) % 7
      const monDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day - distanceToMonday))
      const sunDate = new Date(Date.UTC(monDate.getUTCFullYear(), monDate.getUTCMonth(), monDate.getUTCDate() + 6))

      const monYear = monDate.getUTCFullYear()
      const monMonth = monDate.getUTCMonth() + 1
      const monDay = monDate.getUTCDate()

      const sunYear = sunDate.getUTCFullYear()
      const sunMonth = sunDate.getUTCMonth() + 1
      const sunDay = sunDate.getUTCDate()

      start = zonedTimeToUtc(monYear, monMonth, monDay, 0, 0, 0, 0, effectiveTimezone)
      end = zonedTimeToUtc(sunYear, sunMonth, sunDay, 23, 59, 59, 999, effectiveTimezone)

      startDateString = `${monYear}-${String(monMonth).padStart(2, '0')}-${String(monDay).padStart(2, '0')}`
      endDateString = `${sunYear}-${String(sunMonth).padStart(2, '0')}-${String(sunDay).padStart(2, '0')}`
      label = `This Week (${startDateString} to ${endDateString}${effectiveTimezone !== 'UTC' ? ` [${effectiveTimezone}]` : ''})`
      break
    }

    case 'last_week': {
      // Prior calendar week in local timezone: Monday of previous week to Sunday of previous week
      const distanceToMonday = (currentParts.weekday + 6) % 7
      const lastMonDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day - distanceToMonday - 7))
      const lastSunDate = new Date(Date.UTC(lastMonDate.getUTCFullYear(), lastMonDate.getUTCMonth(), lastMonDate.getUTCDate() + 6))

      const monYear = lastMonDate.getUTCFullYear()
      const monMonth = lastMonDate.getUTCMonth() + 1
      const monDay = lastMonDate.getUTCDate()

      const sunYear = lastSunDate.getUTCFullYear()
      const sunMonth = lastSunDate.getUTCMonth() + 1
      const sunDay = lastSunDate.getUTCDate()

      start = zonedTimeToUtc(monYear, monMonth, monDay, 0, 0, 0, 0, effectiveTimezone)
      end = zonedTimeToUtc(sunYear, sunMonth, sunDay, 23, 59, 59, 999, effectiveTimezone)

      startDateString = `${monYear}-${String(monMonth).padStart(2, '0')}-${String(monDay).padStart(2, '0')}`
      endDateString = `${sunYear}-${String(sunMonth).padStart(2, '0')}-${String(sunDay).padStart(2, '0')}`
      label = `Last Week (${startDateString} to ${endDateString}${effectiveTimezone !== 'UTC' ? ` [${effectiveTimezone}]` : ''})`
      break
    }

    case 'last_7_days': {
      // Rolling 7-day window ending now
      end = new Date(anchorDate.getTime())
      start = new Date(anchorDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      startDateString = getZonedDateParts(start, effectiveTimezone).dateString
      endDateString = getZonedDateParts(end, effectiveTimezone).dateString
      label = `Last 7 Rolling Days (${startDateString} to ${endDateString})`
      break
    }

    case 'last_30_days': {
      end = new Date(anchorDate.getTime())
      start = new Date(anchorDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      startDateString = getZonedDateParts(start, effectiveTimezone).dateString
      endDateString = getZonedDateParts(end, effectiveTimezone).dateString
      label = `Last 30 Rolling Days (${startDateString} to ${endDateString})`
      break
    }

    default: {
      end = new Date(anchorDate.getTime())
      start = new Date(anchorDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      startDateString = getZonedDateParts(start, effectiveTimezone).dateString
      endDateString = getZonedDateParts(end, effectiveTimezone).dateString
      label = `Rolling Window (${startDateString} to ${endDateString})`
    }
  }

  return {
    type: expression,
    label,
    start,
    end,
    startIso: formatDateToIsoString(start),
    endIso: formatDateToIsoString(end),
    startDateString,
    endDateString,
    timezone: effectiveTimezone,
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
