const DAY = 24 * 60 * 60 * 1000

// Dates are handled as "YYYY-MM-DD" strings in UTC, the same way the API stores them (UTC midnight).
export const toISODate = (d) => new Date(d).toISOString().slice(0, 10)
export const todayISO = () => toISODate(new Date())
export const addDays = (iso, n) => toISODate(new Date(new Date(iso).getTime() + n * DAY))
export const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY)

export const showDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export const baht = (n) =>
  `฿${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const MAX_NIGHTS = 3
