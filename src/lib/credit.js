// Shared helpers for invoices, receipts, statements and payments.

export const PAY_METHOD = {
  momo: 'MTN Mobile Money',
  bank_transfer: 'Bank transfer',
  bank_deposit: 'Bank deposit',
  cheque: 'Cheque',
  cash: 'Cash',
  card: 'Card (Visa / Mastercard)',
}
// Methods a customer can choose when recording a payment
export const CUSTOMER_PAY_METHODS = ['momo', 'bank_transfer', 'bank_deposit', 'cheque', 'cash']

export const REF_LABEL = {
  momo: 'MoMo Transaction ID',
  bank_transfer: 'Bank transfer reference',
  bank_deposit: 'Deposit slip / teller number',
  cheque: 'Cheque number',
  cash: 'Receipt or note (optional)',
  card: 'Card payment reference',
}

export const PAYMENT_STATUS = {
  submitted: { label: 'Being checked', cls: 'bg-[#fff4d6] text-[#7a5200]' },
  confirmed: { label: 'Confirmed', cls: 'bg-aqua text-ink' },
  rejected: { label: 'Not confirmed', cls: 'bg-[#fdecea] text-[#7a1a12]' },
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100
export const invoiceNo = (o) => `INV-${o.ref}`

/** Amount still owed on a credit order (0 for other orders). */
export const balanceOf = (o) => (o?.payment_method === 'credit' && o.status !== 'cancelled' ? Math.max(money(Number(o.total) - Number(o.amount_paid)), 0) : 0)

export function daysOverdue(o, today = todayISO()) {
  if (!o?.due_date || balanceOf(o) <= 0 || o.due_date >= today) return 0
  return Math.round((new Date(today) - new Date(o.due_date)) / 86400000)
}

/** Invoice payment state: paid | part | unpaid | overdue | cancelled | n/a (not a credit order). */
export function invoiceState(o) {
  if (o.status === 'cancelled') return 'cancelled'
  if (o.payment_method !== 'credit') return 'n/a'
  const bal = balanceOf(o)
  if (bal <= 0) return 'paid'
  if (daysOverdue(o) > 0) return 'overdue'
  return Number(o.amount_paid) > 0 ? 'part' : 'unpaid'
}
export const INVOICE_STATE = {
  paid: { label: 'Paid', cls: 'bg-aqua text-ink' },
  part: { label: 'Part paid', cls: 'bg-[#fff4d6] text-[#7a5200]' },
  unpaid: { label: 'Unpaid', cls: 'bg-sand text-ink' },
  overdue: { label: 'Overdue', cls: 'bg-[#fdecea] text-[#7a1a12]' },
  cancelled: { label: 'Cancelled', cls: 'bg-sand text-muted' },
}

/** Ageing of unpaid credit invoices (for the statement). */
export function ageing(orders, today = todayISO()) {
  const b = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 }
  for (const o of orders) {
    const bal = balanceOf(o)
    if (bal <= 0) continue
    const d = daysOverdue(o, today)
    if (d <= 0) b.current += bal
    else if (d <= 30) b.d30 += bal
    else if (d <= 60) b.d60 += bal
    else if (d <= 90) b.d90 += bal
    else b.over90 += bal
  }
  for (const k in b) b[k] = money(b[k])
  return b
}

/** Payments (confirmed) that were applied to this order. */
export function paymentsFor(order, payments) {
  const out = []
  for (const p of payments || []) {
    if (p.status !== 'confirmed') continue
    for (const a of p.allocations || []) if (a.order_id === order.id) out.push({ ...p, applied: Number(a.amount) })
  }
  return out
}

// ── Amount in words (receipts) ────────────────────────────────────────────
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function under1000(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  const parts = []
  if (h) parts.push(`${ONES[h]} hundred`)
  if (r) parts.push(r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ''}`)
  return parts.join(' and ')
}
function wholeWords(n) {
  if (n === 0) return 'zero'
  const scales = [
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ]
  const parts = []
  for (const [v, w] of scales) {
    if (n >= v) {
      parts.push(`${under1000(Math.floor(n / v))} ${w}`)
      n %= v
    }
  }
  if (n) parts.push((parts.length && n < 100 ? 'and ' : '') + under1000(n))
  return parts.join(' ')
}
export function amountInWords(amount) {
  const total = Math.round((Number(amount) || 0) * 100)
  const cedis = Math.floor(total / 100)
  const pesewas = total % 100
  let s = `${wholeWords(cedis)} Ghana cedi${cedis === 1 ? '' : 's'}`
  if (pesewas) s += ` and ${wholeWords(pesewas)} pesewa${pesewas === 1 ? '' : 's'}`
  return `${s[0].toUpperCase()}${s.slice(1)} only`
}
