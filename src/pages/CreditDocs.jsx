// Printable customer documents: invoice, payment receipt and statement of account.
// Each page has "Print / Save as PDF" (the browser's print dialog can save a PDF on phones and computers).
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuPrinter, LuWallet } from 'react-icons/lu'
import site from '../data/site.json'
import { useAuth } from '../context/AuthContext.jsx'
import { accounts } from '../lib/accounts.js'
import {
  ageing,
  amountInWords,
  balanceOf,
  daysOverdue,
  INVOICE_STATE,
  invoiceNo,
  invoiceState,
  money,
  PAY_METHOD,
  PAYMENT_STATUS,
  paymentsFor,
  REF_LABEL,
  todayISO,
} from '../lib/credit.js'
import { formatDate, ghs, prettyGhPhone } from '../lib/format.js'
import { Link, useSearchParams } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import Logo from '../components/Logo.jsx'
import { AccountOffline } from './Info.jsx'
import { LoginPage, METHOD, ORDER_STATUS } from './AccountPages.jsx'

const g = (n) => ghs(n, { decimals: 2 })

/* ── shared layout ─────────────────────────────────────────────────────── */

function Pill({ cls, children }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold print:border print:border-current ${cls}`}>{children}</span>
}

function Toolbar({ backTo = '/account', children }) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2">
      <Link to={backTo} className="btn btn-outline min-h-11 py-2">
        <LuArrowLeft aria-hidden="true" /> Back
      </Link>
      <button type="button" onClick={() => window.print()} className="btn btn-primary min-h-11 py-2">
        <LuPrinter aria-hidden="true" /> Print / Save as PDF
      </button>
      {children}
    </div>
  )
}

function Letterhead({ title, number, stamp }) {
  const a = site.address
  return (
    <header className="flex flex-col gap-6 border-b-2 border-primary pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <Logo />
        <address className="mt-3 text-xs not-italic leading-relaxed text-muted">
          {site.legalName}
          <br />
          {a.street}, {a.area}, {a.city}, {a.region} Region · {a.gps}
          <br />
          {site.phones.join(' · ')}
          <br />
          {site.email}
        </address>
      </div>
      <div className="sm:text-right">
        <p className="font-heading text-3xl uppercase tracking-wide text-primary">{title}</p>
        {number && <p className="mt-1 font-bold tabular-nums">{number}</p>}
        {stamp && <div className="mt-2">{stamp}</div>}
      </div>
    </header>
  )
}

function Meta({ rows }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Party({ label, p, fallback }) {
  const name = p?.business_name || p?.full_name || fallback?.name || '—'
  return (
    <div className="text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-bold">{name}</p>
      {p?.business_name && p?.full_name && <p>Attn: {p.full_name}{p.contact_role ? `, ${p.contact_role}` : ''}</p>}
      <p>{prettyGhPhone(p?.phone || fallback?.phone)}</p>
      {(p?.email || fallback?.email) && <p>{p?.email || fallback?.email}</p>}
      {p && [p.address, p.city, p.gps].some(Boolean) && <p>{[p.address, p.city, p.gps].filter(Boolean).join(', ')}</p>}
      {p?.registration_number && <p>Reg / TIN: {p.registration_number}</p>}
    </div>
  )
}

function PayInstructions() {
  return (
    <section className="mt-8 rounded-2xl bg-aqua-soft p-5 text-sm print:border print:border-line print:bg-transparent">
      <h2 className="font-body text-base font-bold">How to pay</h2>
      <ul className="mt-2 space-y-1">
        <li>
          <strong>{site.momo.network}:</strong> {site.momo.display} ({site.momo.accountName})
        </li>
        <li>
          <strong>Bank:</strong> {site.bank.accountName}, {site.bank.bankName}, {site.bank.branch} — account <span className="whitespace-nowrap">{site.bank.accountNumber}</span>
        </li>
        <li>Use the invoice number as your payment reference, then record the payment in My Account on our website so we can issue your receipt.</li>
      </ul>
    </section>
  )
}

function Paper({ children }) {
  return <article className="doc-paper rounded-3xl bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">{children}</article>
}

function Shell({ children }) {
  return <section className="container-x max-w-4xl py-8 sm:py-12 print:max-w-none print:p-0">{children}</section>
}

function Gate({ children }) {
  const auth = useAuth()
  if (!auth.enabled) return <AccountOffline />
  if (auth.loading) return <Shell>
      <p className="py-20 text-center text-muted" aria-busy="true">Loading…</p>
    </Shell>
  if (!auth.user) return <LoginPage />
  return children
}

function Missing({ what }) {
  return (
    <Shell>
      <div className="card p-8 text-center">
        <h1 className="text-3xl">{what} not found</h1>
        <p className="mt-3 text-muted">It may belong to a different account, or the link is incomplete.</p>
        <Link to="/account" className="btn btn-primary mt-6">
          Back to my account
        </Link>
      </div>
    </Shell>
  )
}

function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    let live = true
    setState({ loading: true, data: null, error: '' })
    fn()
      .then((data) => live && setState({ loading: false, data, error: '' }))
      .catch((e) => live && setState({ loading: false, data: null, error: e.message }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

// `wide` columns are hidden on phones (and shown when printing) so tables fit without sideways scrolling
const Th = ({ children, right, wide }) => (
  <th scope="col" className={`border-b border-line px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted sm:px-3 ${right ? 'text-right' : 'text-left'} ${wide ? 'hidden sm:table-cell print:table-cell' : ''}`}>
    {children}
  </th>
)
const Td = ({ children, right, strong, wide, className = '' }) => (
  <td className={`border-b border-line px-2 py-2 align-top sm:px-3 ${right ? 'text-right tabular-nums' : ''} ${strong ? 'font-bold' : ''} ${wide ? 'hidden sm:table-cell print:table-cell' : ''} ${className}`}>{children}</td>
)
const shortDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

/* ── Invoice ───────────────────────────────────────────────────────────── */

function InvoiceBody({ ref }) {
  const auth = useAuth()
  const st = useLoad(async () => {
    const order = await accounts.getOrder(ref)
    if (!order) return null
    const statement = order.user_id ? await accounts.statement(order.user_id).catch(() => null) : null
    return { order, payments: statement?.payments || [], profile: order.profiles || statement?.profile || null }
  }, [ref, auth.user?.id])

  if (st.loading) return <Shell><p className="py-20 text-center text-muted" aria-busy="true">Loading invoice…</p></Shell>
  if (!st.data) return <Missing what="Invoice" />
  const { order: o, payments, profile } = st.data
  const isCredit = o.payment_method === 'credit'
  const state = invoiceState(o)
  const bal = balanceOf(o)
  const applied = paymentsFor(o, payments)
  const late = daysOverdue(o)
  const deliveryText =
    o.delivery?.method === 'pickup' ? `Pickup at our ${site.address.area} office` : [o.delivery?.zone, o.delivery?.address, o.delivery?.gps].filter(Boolean).join(', ') || '—'

  return (
    <Shell>
      <Toolbar backTo={auth.isAdmin && o.user_id !== auth.user?.id ? '/admin' : '/account'}>
        {isCredit && bal > 0 && o.user_id === auth.user?.id && (
          <Link to={`/account?pay=${o.id}#record-payment`} className="btn btn-outline min-h-11 py-2">
            <LuWallet aria-hidden="true" /> Record a payment
          </Link>
        )}
      </Toolbar>
      <Paper>
        <Letterhead title="Invoice" number={invoiceNo(o)} stamp={state !== 'n/a' && <Pill cls={INVOICE_STATE[state].cls}>{INVOICE_STATE[state].label}</Pill>} />

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Party label="Bill to" p={profile} fallback={o.customer} />
          <div className="text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Deliver to</p>
            <p className="mt-1">{deliveryText}</p>
            {o.received_status === 'received' && <p className="mt-1 font-semibold text-primary">Received by customer {formatDate(o.received_at)}</p>}
            {o.received_status === 'issue' && <p className="mt-1 font-semibold text-danger">Problem reported: {o.received_note}</p>}
          </div>
          <Meta
            rows={[
              ['Invoice date', formatDate(o.created_at)],
              ['Order ref', o.ref],
              isCredit && ['Terms', `${profile?.payment_terms_days ?? '—'} days credit`],
              isCredit && o.due_date && ['Due date', <span className={late ? 'text-danger' : ''}>{formatDate(o.due_date)}{late ? ` (${late} days overdue)` : ''}</span>],
              !isCredit && ['Payment', `${METHOD[o.payment_method] || o.payment_method}${o.payment_ref ? ` · ${o.payment_ref}` : ''}`],
              ['Order status', ORDER_STATUS[o.status] || o.status],
            ]}
          />
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Description</Th>
                <Th right>Qty</Th>
                <Th right wide>
                  Unit price
                </Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {(o.items || []).map((i, n) => (
                <tr key={n}>
                  <Td>
                    {i.name}
                    {i.variantLabel && <span className="block text-xs text-muted">{i.variantLabel}</span>}
                    <span className="block text-xs text-muted sm:hidden print:hidden">@ {g(i.price)}</span>
                  </Td>
                  <Td right>{i.qty}</Td>
                  <Td right wide>
                    {g(i.price)}
                  </Td>
                  <Td right>{g(i.price * i.qty)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <dl className="grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm tabular-nums">
            <dt>Subtotal</dt>
            <dd className="text-right">{g(o.subtotal)}</dd>
            <dt>Delivery</dt>
            <dd className="text-right">{Number(o.delivery_fee) ? g(o.delivery_fee) : 'Free'}</dd>
            <dt className="border-t border-ink pt-2 font-bold">Total</dt>
            <dd className="border-t border-ink pt-2 text-right font-bold">{g(o.total)}</dd>
            {isCredit && (
              <>
                <dt>Paid</dt>
                <dd className="text-right">− {g(o.amount_paid)}</dd>
                <dt className="rounded-l-lg bg-sand py-2 pl-2 text-base font-bold print:bg-transparent">Balance due</dt>
                <dd className={`rounded-r-lg bg-sand py-2 pr-2 text-right text-base font-bold print:bg-transparent ${late ? 'text-danger' : ''}`}>{g(bal)}</dd>
              </>
            )}
          </dl>
        </div>

        {applied.length > 0 && (
          <section className="mt-8">
            <h2 className="font-body text-base font-bold">Payments received</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {applied.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {formatDate(p.paid_on)} · {PAY_METHOD[p.method]}
                    {p.reference ? ` · ${p.reference}` : ''} ·{' '}
                    <Link to={`/account/receipt?id=${p.id}`} className="font-semibold text-primary underline">
                      {p.receipt_no}
                    </Link>
                  </span>
                  <span className="tabular-nums">{g(p.applied)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isCredit && bal > 0 && <PayInstructions />}
        <p className="mt-8 text-center text-xs text-muted">Thank you for your business. Questions about this invoice? WhatsApp {site.whatsapp.display}.</p>
      </Paper>
    </Shell>
  )
}

export function InvoicePage() {
  useSeo({ title: 'Invoice', noindex: true })
  const ref = useSearchParams().get('ref') || ''
  return <Gate>{ref ? <InvoiceBody ref={ref} /> : <Missing what="Invoice" />}</Gate>
}

/* ── Receipt ───────────────────────────────────────────────────────────── */

function ReceiptBody({ id }) {
  const auth = useAuth()
  const st = useLoad(async () => {
    const p = await accounts.getPayment(id)
    if (!p) return null
    const statement = await accounts.statement(p.user_id).catch(() => null)
    return { p, summary: statement?.summary || null, profile: p.profiles || statement?.profile }
  }, [id, auth.user?.id])

  if (st.loading) return <Shell><p className="py-20 text-center text-muted" aria-busy="true">Loading receipt…</p></Shell>
  if (!st.data) return <Missing what="Receipt" />
  const { p, summary, profile } = st.data
  const ok = p.status === 'confirmed'
  const s = PAYMENT_STATUS[p.status]

  return (
    <Shell>
      <Toolbar backTo={auth.isAdmin && p.user_id !== auth.user?.id ? '/admin' : '/account'} />
      <Paper>
        <Letterhead title={ok ? 'Payment receipt' : 'Payment notice'} number={ok ? p.receipt_no : null} stamp={<Pill cls={s.cls}>{s.label}</Pill>} />
        {!ok && (
          <p className={`mt-6 rounded-xl p-4 text-sm font-semibold ${p.status === 'rejected' ? 'bg-[#fdecea] text-[#7a1a12]' : 'bg-[#fff4d6] text-[#5c3d00]'}`}>
            {p.status === 'rejected'
              ? `This payment could not be confirmed: ${p.admin_note || 'please contact us.'}`
              : 'This is not a receipt yet. We are checking this payment against our MoMo / bank statement. Your official receipt will appear here once it is confirmed.'}
          </p>
        )}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Party label="Received from" p={profile} />
          <Meta
            rows={[
              ok && ['Receipt date', formatDate(p.confirmed_at)],
              ['Date paid', formatDate(p.paid_on)],
              ['Method', PAY_METHOD[p.method] || p.method],
              p.reference && [REF_LABEL[p.method]?.replace(' (optional)', '') || 'Reference', p.reference],
              ['Recorded', `${formatDate(p.created_at)}${p.recorded_by === 'staff' ? ' by Evaclear' : ''}`],
            ]}
          />
        </div>

        <div className="mt-8 rounded-2xl border-2 border-primary p-5 text-center">
          <p className="text-sm text-muted">Amount {ok ? 'received' : 'reported'}</p>
          <p className="font-heading text-4xl tabular-nums text-primary">{g(p.amount)}</p>
          <p className="mt-1 text-sm italic">{amountInWords(p.amount)}</p>
        </div>

        {ok && (
          <section className="mt-8">
            <h2 className="font-body text-base font-bold">Applied to</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th right>Amount applied</Th>
                  </tr>
                </thead>
                <tbody>
                  {(p.allocations || []).map((a) => (
                    <tr key={a.order_id}>
                      <Td>
                        <Link to={`/account/invoice?ref=${encodeURIComponent(a.ref)}`} className="font-semibold text-primary underline">
                          INV-{a.ref}
                        </Link>
                      </Td>
                      <Td right>{g(a.amount)}</Td>
                    </tr>
                  ))}
                  {Number(p.unallocated) > 0 && (
                    <tr>
                      <Td>Credit on account (not yet applied)</Td>
                      <Td right>{g(p.unallocated)}</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {summary && (
              <p className="mt-4 text-sm">
                Balance on account as at {formatDate(new Date().toISOString())}: <strong className="tabular-nums">{g(summary.outstanding)}</strong>
              </p>
            )}
          </section>
        )}
        {p.note && <p className="mt-6 text-sm text-muted">Customer note: {p.note}</p>}
        {ok && <p className="mt-10 text-center text-xs text-muted">This receipt was issued electronically by {site.legalName} and is valid without a signature.</p>}
      </Paper>
    </Shell>
  )
}

export function ReceiptPage() {
  useSeo({ title: 'Payment receipt', noindex: true })
  const id = useSearchParams().get('id') || ''
  return <Gate>{id ? <ReceiptBody id={id} /> : <Missing what="Receipt" />}</Gate>
}

/* ── Statement of account / outstanding payments ───────────────────────── */

function StatementBody({ userId }) {
  const auth = useAuth()
  const st = useLoad(() => accounts.statement(userId || undefined), [userId, auth.user?.id])
  if (st.loading) return <Shell><p className="py-20 text-center text-muted" aria-busy="true">Loading statement…</p></Shell>
  if (!st.data?.profile) return <Missing what="Account" />
  const { profile, orders, payments, summary } = st.data
  const today = todayISO()
  const credit = orders.filter((o) => o.payment_method === 'credit' && o.status !== 'cancelled')
  const open = credit.filter((o) => balanceOf(o) > 0)
  const confirmed = payments.filter((p) => p.status === 'confirmed')
  const checking = payments.filter((p) => p.status === 'submitted')
  const age = ageing(credit, today)
  const outstanding = money(open.reduce((t, o) => t + balanceOf(o), 0))

  // Ledger: invoices add to the balance, confirmed payments reduce it
  const lines = [
    ...credit.map((o) => ({ date: o.created_at, kind: 'inv', label: `Invoice INV-${o.ref}`, to: `/account/invoice?ref=${encodeURIComponent(o.ref)}`, debit: Number(o.total) })),
    ...confirmed.map((p) => ({
      date: p.confirmed_at || p.created_at,
      kind: 'pay',
      label: `Payment ${p.receipt_no} · ${PAY_METHOD[p.method]}${p.reference ? ` · ${p.reference}` : ''}`,
      to: `/account/receipt?id=${p.id}`,
      credit: money(Number(p.amount) - Number(p.unallocated || 0)),
    })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  let run = 0
  for (const l of lines) {
    run = money(run + (l.debit || 0) - (l.credit || 0))
    l.balance = run
  }
  const adjust = money(outstanding - run)
  if (Math.abs(adjust) >= 0.01) lines.push({ date: today, kind: 'adj', label: 'Other payments / adjustments by Evaclear', credit: adjust < 0 ? -adjust : 0, debit: adjust > 0 ? adjust : 0, balance: outstanding })

  return (
    <Shell>
      <Toolbar backTo={userId && userId !== auth.user?.id ? '/admin' : '/account'}>
        {outstanding > 0 && profile.id === auth.user?.id && (
          <Link to="/account#record-payment" className="btn btn-outline min-h-11 py-2">
            <LuWallet aria-hidden="true" /> Record a payment
          </Link>
        )}
      </Toolbar>
      <Paper>
        <Letterhead title="Statement of account" number={`As at ${formatDate(today)}`} />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Party label="Customer" p={profile} />
          <Meta
            rows={[
              ['Credit limit', g(summary?.credit_limit ?? profile.credit_limit)],
              ['Payment terms', `${profile.payment_terms_days} days`],
              ['Available to spend', g(summary?.available ?? 0)],
              ['Account status', profile.status[0].toUpperCase() + profile.status.slice(1)],
            ]}
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Total outstanding', outstanding, true],
            ['Not yet due', age.current],
            ['1–30 days overdue', age.d30],
            ['31–60 days', age.d60],
            ['61–90 days', age.d90],
            ['Over 90 days', age.over90],
          ].map(([k, v, main]) => (
            <div key={k} className={`rounded-xl p-3 ${main ? 'bg-primary text-white print:border-2 print:border-ink print:text-ink' : v > 0 && k !== 'Not yet due' ? 'bg-[#fdecea] text-[#7a1a12]' : 'bg-sand'}`}>
              <p className="text-xs">{k}</p>
              <p className="mt-1 font-bold tabular-nums">{g(v)}</p>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="font-body text-base font-bold">Outstanding invoices</h2>
          {open.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing outstanding. Thank you!</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th wide>Date</Th>
                    <Th>Due</Th>
                    <Th right wide>
                      Total
                    </Th>
                    <Th right wide>
                      Paid
                    </Th>
                    <Th right>Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((o) => {
                    const d = daysOverdue(o, today)
                    return (
                      <tr key={o.id}>
                        <Td>
                          <Link to={`/account/invoice?ref=${encodeURIComponent(o.ref)}`} className="font-semibold text-primary underline">
                            {invoiceNo(o)}
                          </Link>
                        </Td>
                        <Td wide className="whitespace-nowrap">
                          {shortDate(o.created_at)}
                        </Td>
                        <Td className={`whitespace-nowrap ${d ? 'font-bold text-danger' : ''}`}>
                          {o.due_date ? shortDate(o.due_date) : '—'}
                          {d > 0 && <span className="block text-xs">{d} days overdue</span>}
                        </Td>
                        <Td right wide>
                          {g(o.total)}
                        </Td>
                        <Td right wide>
                          {g(o.amount_paid)}
                        </Td>
                        <Td right strong>
                          {g(balanceOf(o))}
                        </Td>
                      </tr>
                    )
                  })}
                  <tr>
                    <Td strong>Total outstanding</Td>
                    <Td wide />
                    <Td />
                    <Td wide />
                    <Td wide />
                    <Td right strong>
                      {g(outstanding)}
                    </Td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-body text-base font-bold">Account activity</h2>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No credit invoices or payments yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Details</Th>
                    <Th right wide>
                      Invoiced
                    </Th>
                    <Th right wide>
                      Paid
                    </Th>
                    <Th right>Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, n) => (
                    <tr key={n}>
                      <Td className="whitespace-nowrap">{shortDate(l.date)}</Td>
                      <Td className="[overflow-wrap:anywhere]">
                        {l.to ? (
                          <Link to={l.to} className="text-primary underline">
                            {l.label}
                          </Link>
                        ) : (
                          l.label
                        )}
                        <span className={`block text-xs tabular-nums sm:hidden print:hidden ${l.credit ? 'text-primary' : 'text-muted'}`}>{l.debit ? `+ ${g(l.debit)}` : `− ${g(l.credit)}`}</span>
                      </Td>
                      <Td right wide>
                        {l.debit ? g(l.debit) : ''}
                      </Td>
                      <Td right wide>
                        {l.credit ? g(l.credit) : ''}
                      </Td>
                      <Td right strong>{g(l.balance)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {checking.length > 0 && (
          <section className="mt-8 rounded-xl bg-[#fff4d6] p-4 text-sm text-[#5c3d00] print:border print:border-line print:bg-transparent">
            <h2 className="font-body text-base font-bold">Payments being checked</h2>
            <p className="mt-1">These are not yet included in the balance above.</p>
            <ul className="mt-2 space-y-1">
              {checking.map((p) => (
                <li key={p.id}>
                  {formatDate(p.paid_on)} · {PAY_METHOD[p.method]}
                  {p.reference ? ` · ${p.reference}` : ''} · <strong>{g(p.amount)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {outstanding > 0 && <PayInstructions />}
        <p className="mt-8 text-center text-xs text-muted">If anything on this statement looks wrong, please WhatsApp {site.whatsapp.display} or email {site.email}.</p>
      </Paper>
    </Shell>
  )
}

export function StatementPage() {
  useSeo({ title: 'Statement of account', noindex: true })
  const userId = useSearchParams().get('user') || ''
  return (
    <Gate>
      <StatementBody userId={userId} />
    </Gate>
  )
}
