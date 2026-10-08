// Currency & Ghana phone helpers

export function ghs(amount, { decimals } = {}) {
  const n = Number(amount) || 0
  const d = decimals ?? (Number.isInteger(n) ? 0 : 2)
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

/**
 * Normalise a Ghana phone number to +233XXXXXXXXX.
 * Accepts "024 123 4567", "0241234567", "241234567", "+233 24 123 4567", "233241234567".
 */
export function normaliseGhPhone(input) {
  const digits = String(input || '').replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`
  if (digits.length === 9) return `+233${digits}`
  return null
}

export function isValidGhPhone(input) {
  const n = normaliseGhPhone(input)
  return !!n && /^\+233[2-5]\d{8}$/.test(n)
}

export function prettyGhPhone(e164) {
  const m = /^\+233(\d{2})(\d{3})(\d{4})$/.exec(e164 || '')
  return m ? `+233 ${m[1]} ${m[2]} ${m[3]}` : e164
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}
