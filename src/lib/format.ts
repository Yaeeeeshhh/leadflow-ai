import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

export function formatDate(value: string | null | undefined, pattern = 'MMM d, yyyy') {
  if (!value) return '—'
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, pattern) : '—'
}

export function timeAgo(value: string) {
  const parsed = parseISO(value)
  return isValid(parsed) ? formatDistanceToNow(parsed, { addSuffix: true }) : '—'
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function initials(name: string | null | undefined) {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
}
