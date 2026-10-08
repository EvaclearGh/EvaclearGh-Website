// Staff dashboard: approve accounts, set credit limits, manage credit orders and record payments.
// Only accounts with role = 'admin' can use it (enforced by the database, not just this page).
import { useEffect, useMemo, useState } from 'react'
import { LuFileText, LuReceipt, LuRefreshCw } from 'react-icons/lu'
import { useAuth } from '../context/AuthContext.jsx'
import { accounts } from '../lib/accounts.js'
import { formatDate, ghs, prettyGhPhone } from '../lib/format.js'
import { Link, useSearchParams } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { LoginForm, METHOD, ORDER_STATUS, StatusPill } from './AccountPages.jsx'
import WebsiteTab from './AdminWebsite.jsx'
import { CUSTOMER_PAY_METHODS, invoiceNo, PAY_METHOD, PAYMENT_STATUS } from '../lib/credit.js'
import { AccountOffline } from './Info.jsx'

const todayISO = () => new Date().toISOString().slice(0, 10)
const balance = (o) => (o.payment_method === 'credit' && o.status !== 'cancelled' ? Math.max(Number(o.total) - Number(o.amount_paid), 0) : 0)

function AccountCard({ p, owed, onSaved }) {
  const [f, setF] = useState({ credit_limit: p.credit_limit ?? 0, payment_terms_days: p.payment_terms_days ?? 30, admin_notes: p.admin_notes || '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const save = async (status) => {
    setBusy(true)
    setMsg('')
    try {
      await accounts.admin.updateProfile(p.id, {
        credit_limit: Math.max(Number(f.credit_limit) || 0, 0),
        payment_terms_days: Math.max(Math.min(Number(f.payment_terms_days) || 0, 365), 0),
        admin_notes: f.admin_notes || null,
        ...(status ? { status } : {}),
      })
      setMsg(status ? `Marked as ${status}.` : 'Saved.')
      onSaved()
    } catch (x) {
      setMsg(x.message)
    } finally {
      setBusy(false)
    }
  }
  const id = (k) => `${k}-${p.id}`
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">
            {p.business_name || p.full_name} <StatusPill status={p.status} />
            {p.role === 'admin' && <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs font-bold">Staff</span>}
          </p>
          <p className="text-sm text-muted">
            {p.account_type === 'institution' ? `${p.business_type || 'Business'} · contact ${p.full_name}${p.contact_role ? ` (${p.contact_role})` : ''}` : 'Individual'}
          </p>
          <p className="mt-1 text-sm">
            {prettyGhPhone(p.phone)} · {p.email}
          </p>
          <p className="text-sm text-muted">
            {[p.address, p.city, p.gps].filter(Boolean).join(', ')}
            {p.registration_number ? ` · Reg/TIN: ${p.registration_number}` : ''}
          </p>
          <p className="mt-1 text-xs text-muted">Applied {formatDate(p.created_at)}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            Requested: <strong>{ghs(p.requested_credit || 0)}</strong>
          </p>
          <p>
            Owed now: <strong>{ghs(owed)}</strong>
          </p>
          <Link to={`/account/statement?user=${p.id}`} className="mt-1 inline-flex items-center gap-1 font-semibold text-primary underline">
            <LuFileText aria-hidden="true" /> Statement
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <div>
          <label htmlFor={id('limit')} className="label">
            Credit limit (GH₵)
          </label>
          <input id={id('limit')} inputMode="numeric" className="field" value={f.credit_limit} onChange={(e) => setF({ ...f, credit_limit: e.target.value })} />
        </div>
        <div>
          <label htmlFor={id('terms')} className="label">
            Pay within (days)
          </label>
          <input id={id('terms')} inputMode="numeric" className="field" value={f.payment_terms_days} onChange={(e) => setF({ ...f, payment_terms_days: e.target.value })} />
        </div>
        <div>
          <label htmlFor={id('notes')} className="label">
            Staff notes (not shown to customer)
          </label>
          <input id={id('notes')} className="field" value={f.admin_notes} onChange={(e) => setF({ ...f, admin_notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.status !== 'approved' && (
          <button type="button" disabled={busy} onClick={() => save('approved')} className="btn btn-primary min-h-10 py-2">
            Approve
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => save()} className="btn btn-outline min-h-10 py-2">
          Save limit & terms
        </button>
        {p.status === 'pending' && (
          <button type="button" disabled={busy} onClick={() => save('rejected')} className="btn min-h-10 border-2 border-line py-2">
            Reject
          </button>
        )}
        {p.status === 'approved' && p.role !== 'admin' && (
          <button type="button" disabled={busy} onClick={() => save('suspended')} className="btn min-h-10 border-2 border-line py-2">
            Suspend credit
          </button>
        )}
        {(p.status === 'rejected' || p.status === 'suspended') && (
          <button type="button" disabled={busy} onClick={() => save('pending')} className="btn min-h-10 border-2 border-line py-2">
            Move back to pending
          </button>
        )}
        {msg && (
          <span role="status" className="text-sm font-semibold">
            {msg}
          </span>
        )}
      </div>
    </li>
  )
}

function OrderRow({ o, onSaved }) {
  const [pay, setPay] = useState('')
  const [method, setMethod] = useState('momo')
  const [payRef, setPayRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const bal = balance(o)
  const late = bal > 0 && o.due_date && o.due_date < todayISO()
  const update = async (patch, note) => {
    setBusy(true)
    setMsg('')
    try {
      await accounts.admin.updateOrder(o.id, patch)
      setMsg(note)
      setPay('')
      onSaved()
    } catch (x) {
      setMsg(x.message)
    } finally {
      setBusy(false)
    }
  }
  // Money received → a confirmed payment with a numbered receipt, applied to this invoice first
  const record = async (amt) => {
    setBusy(true)
    setMsg('')
    try {
      const r = await accounts.admin.recordPayment({ userId: o.user_id, amount: amt, method, reference: payRef.trim(), orderId: o.id })
      setMsg(`Recorded ${ghs(amt)} · receipt ${r.receipt_no}`)
      setPay('')
      setPayRef('')
      onSaved()
    } catch (x) {
      setMsg(x.message)
    } finally {
      setBusy(false)
    }
  }
  const customer = o.profiles?.business_name || o.profiles?.full_name || o.customer?.name || '—'
  return (
    <tr className="border-t border-line align-top">
      <th scope="row" className="px-3 py-3 font-semibold">
        {o.ref}
        <span className="block font-normal text-muted">{formatDate(o.created_at)}</span>
        <Link to={`/account/invoice?ref=${encodeURIComponent(o.ref)}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary underline">
          <LuFileText aria-hidden="true" /> {invoiceNo(o)}
        </Link>
        {o.received_status === 'received' && <span className="mt-1 block text-xs font-semibold text-primary">✓ Customer received {formatDate(o.received_at)}</span>}
        {o.received_status === 'issue' && <span className="mt-1 block text-xs font-bold text-danger">⚠ Problem: {o.received_note}</span>}
      </th>
      <td className="px-3 py-3">
        {customer}
        <span className="block text-muted">{prettyGhPhone(o.profiles?.phone || o.customer?.phone)}{!o.user_id && ' · guest'}</span>{o.payment_ref && <span className="block text-xs text-muted">Ref: {o.payment_ref}</span>}
      </td>
      <td className="px-3 py-3 text-muted">{(o.items || []).map((i) => `${i.qty}× ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} @ ${ghs(i.price)}`).join('; ')}</td>
      <td className="px-3 py-3">{METHOD[o.payment_method] || o.payment_method}</td>
      <td className="px-3 py-3 tabular-nums">{ghs(o.total)}</td>
      <td className={`px-3 py-3 tabular-nums ${late ? 'font-bold text-danger' : ''}`}>
        {o.payment_method === 'credit' ? ghs(bal) : '—'}
        {o.due_date && bal > 0 && <span className="block text-xs">due {formatDate(o.due_date)}</span>}
      </td>
      <td className="px-3 py-3">
        <label htmlFor={`st-${o.id}`} className="sr-only">
          Status for {o.ref}
        </label>
        <select id={`st-${o.id}`} className="field min-h-9 py-1 text-sm" value={o.status} disabled={busy} onChange={(e) => update({ status: e.target.value }, 'Status updated.')}>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {o.payment_method === 'credit' && bal > 0 && o.user_id && (
          <form
            className="mt-2 grid grid-cols-2 gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              const amt = Number(pay)
              if (!(amt > 0)) return setMsg('Enter an amount.')
              record(amt)
            }}
          >
            <label htmlFor={`pay-${o.id}`} className="sr-only">
              Payment received for {o.ref}
            </label>
            <input id={`pay-${o.id}`} inputMode="decimal" placeholder="Paid GH₵" className="field min-h-9 py-1 text-sm" value={pay} onChange={(e) => setPay(e.target.value)} />
            <label htmlFor={`pm-${o.id}`} className="sr-only">
              Payment method
            </label>
            <select id={`pm-${o.id}`} className="field min-h-9 py-1 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
              {[...CUSTOMER_PAY_METHODS, 'card'].map((m) => (
                <option key={m} value={m}>
                  {PAY_METHOD[m]}
                </option>
              ))}
            </select>
            <label htmlFor={`pr-${o.id}`} className="sr-only">
              Payment reference
            </label>
            <input id={`pr-${o.id}`} placeholder="Ref / Txn ID" className="field col-span-2 min-h-9 py-1 text-sm" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
            <button type="submit" disabled={busy} className="btn btn-outline min-h-9 px-3 py-1 text-xs">
              Record
            </button>
            <button type="button" disabled={busy} onClick={() => record(bal)} className="btn btn-primary min-h-9 px-3 py-1 text-xs">
              Paid in full
            </button>
          </form>
        )}
        {msg && (
          <span role="status" className="mt-1 block text-xs font-semibold">
            {msg}
          </span>
        )}
      </td>
    </tr>
  )
}

function PaymentRow({ p, onSaved }) {
  const [amount, setAmount] = useState(String(p.amount))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const act = async (fn, done) => {
    setBusy(true)
    setMsg('')
    try {
      const r = await fn()
      setMsg(done(r))
      onSaved()
    } catch (x) {
      setMsg(x.message)
    } finally {
      setBusy(false)
    }
  }
  const s = PAYMENT_STATUS[p.status]
  const who = p.profiles?.business_name || p.profiles?.full_name || '—'
  const forInvoice = p.order_ref ? `INV-${p.order_ref}` : 'Oldest invoices first'
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">
            {ghs(p.amount, { decimals: 2 })} · {PAY_METHOD[p.method] || p.method}{' '}
            <span className={`ml-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
          </p>
          <p className="text-sm">
            {who} · {prettyGhPhone(p.profiles?.phone)}
          </p>
          <p className="text-sm text-muted">
            Paid {formatDate(p.paid_on)}
            {p.reference ? ` · Ref ${p.reference}` : ''} · For: {forInvoice}
            {p.recorded_by === 'staff' ? ' · recorded by staff' : ''}
          </p>
          {p.note && <p className="text-sm">Customer note: {p.note}</p>}
          {p.admin_note && <p className="text-sm text-muted">Staff note: {p.admin_note}</p>}
          {p.status === 'confirmed' && (
            <p className="text-sm text-muted">
              Applied: {(p.allocations || []).map((a) => `INV-${a.ref} ${ghs(a.amount, { decimals: 2 })}`).join(', ') || '—'}
              {Number(p.unallocated) > 0 && ` · unapplied ${ghs(p.unallocated, { decimals: 2 })}`}
            </p>
          )}
        </div>
        <Link to={`/account/receipt?id=${p.id}`} className="btn btn-outline min-h-10 py-2 text-sm">
          <LuReceipt aria-hidden="true" /> {p.receipt_no || 'View'}
        </Link>
      </div>
      {p.status === 'submitted' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
          <div>
            <label htmlFor={`amt-${p.id}`} className="label">
              Amount received (GH₵)
            </label>
            <input id={`amt-${p.id}`} inputMode="decimal" className="field" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`note-${p.id}`} className="label">
              Note (shown to customer if rejected)
            </label>
            <input id={`note-${p.id}`} className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Seen on MoMo statement 7 Oct" />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={busy}
              className="btn btn-primary min-h-11 py-2"
              onClick={() => {
                const a = Number(amount)
                if (!(a > 0)) return setMsg('Enter the amount that arrived.')
                act(() => accounts.admin.confirmPayment(p.id, a, note), (r) => `Confirmed · receipt ${r.receipt_no}`)
              }}
            >
              Confirm & issue receipt
            </button>
            <button type="button" disabled={busy} className="btn min-h-11 border-2 border-line py-2" onClick={() => act(() => accounts.admin.rejectPayment(p.id, note), () => 'Rejected.')}>
              Not received
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p role="status" className="mt-2 text-sm font-semibold">
          {msg}
        </p>
      )}
    </li>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-primary text-white' : 'bg-white hover:bg-aqua-soft'}`}>
      {children}
    </button>
  )
}

export default function AdminPage() {
  useSeo({ title: 'Staff dashboard', noindex: true })
  const auth = useAuth()
  const initialTab = useSearchParams().get('tab')
  const [tab, setTab] = useState(['accounts', 'orders', 'payments', 'website'].includes(initialTab) ? initialTab : 'accounts')
  const [filter, setFilter] = useState('pending')
  const [orderFilter, setOrderFilter] = useState('unpaid')
  const [payFilter, setPayFilter] = useState('submitted')
  const [data, setData] = useState({ profiles: null, orders: null, payments: null, error: '' })

  const load = async () => {
    try {
      const [profiles, orders, payments] = await Promise.all([accounts.admin.profiles(), accounts.admin.orders(), accounts.admin.payments().catch(() => [])])
      setData({ profiles, orders, payments, error: '' })
    } catch (x) {
      setData((d) => ({ ...d, error: x.message }))
    }
  }
  useEffect(() => {
    if (auth.isAdmin) load()
  }, [auth.isAdmin])

  const owedBy = useMemo(() => {
    const m = {}
    for (const o of data.orders || []) m[o.user_id] = (m[o.user_id] || 0) + balance(o)
    return m
  }, [data.orders])

  if (!auth.enabled) return <AccountOffline />
  if (auth.loading) return <div className="container-x py-24 text-center text-muted">Loading…</div>
  if (!auth.user)
    return (
      <section className="container-x max-w-md py-16">
        <p className="eyebrow mb-2">Evaclear staff</p>
        <h1 className="text-4xl">Staff login</h1>
        <p className="mt-2 text-muted">Manage accounts, orders and payments, and edit and publish the website.</p>
        <div className="card mt-6 p-6">
          <LoginForm />
        </div>
      </section>
    )
  if (!auth.isAdmin)
    return (
      <section className="container-x py-24 text-center">
        <h1 className="text-4xl">Staff only</h1>
        <p className="mt-3 text-muted">This login isn't a staff account. Ask the website owner to give your account staff access.</p>
        <Link to="/account" className="btn btn-primary mt-6">
          Back to my account
        </Link>
      </section>
    )

  const profiles = (data.profiles || []).filter((p) => filter === 'all' || p.status === filter)
  const counts = (data.profiles || []).reduce((c, p) => ({ ...c, [p.status]: (c[p.status] || 0) + 1 }), {})
  const orders = (data.orders || []).filter((o) => {
    if (orderFilter === 'unpaid') return balance(o) > 0
    if (orderFilter === 'overdue') return balance(o) > 0 && o.due_date < todayISO()
    if (orderFilter === 'pending') return o.status === 'pending'
    if (orderFilter === 'issues') return o.received_status === 'issue'
    return true
  })
  const refOf = Object.fromEntries((data.orders || []).map((o) => [o.id, o.ref]))
  const payList = (data.payments || []).filter((x) => payFilter === 'all' || x.status === payFilter).map((x) => ({ ...x, order_ref: refOf[x.order_id] }))
  const toCheck = (data.payments || []).filter((x) => x.status === 'submitted').length
  const issues = (data.orders || []).filter((o) => o.received_status === 'issue').length
  const totalOwed = (data.orders || []).reduce((s, o) => s + balance(o), 0)
  const totalOverdue = (data.orders || []).filter((o) => o.due_date < todayISO()).reduce((s, o) => s + balance(o), 0)

  return (
    <>
      <section className="bg-sand">
        <div className="container-x flex flex-wrap items-end justify-between gap-4 py-10">
          <div>
            <p className="eyebrow mb-2">Staff</p>
            <h1 className="text-4xl">Staff dashboard</h1>
            <p className="mt-2 text-muted">
              {counts.pending || 0} waiting for approval · {toCheck} payment{toCheck === 1 ? '' : 's'} to check · {ghs(totalOwed)} owed on credit · <span className={totalOverdue > 0 ? 'font-bold text-danger' : ''}>{ghs(totalOverdue)} overdue</span>
            </p>
          </div>
          <button type="button" onClick={load} className="btn btn-outline">
            <LuRefreshCw aria-hidden="true" /> Refresh
          </button>
        </div>
      </section>
      <div className="container-x py-8">
        <div role="tablist" aria-label="Staff sections" className="mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-3xl bg-sand p-1">
          {[
            ['accounts', 'Accounts'],
            ['orders', 'Orders'],
            ['payments', `Payments${toCheck ? ` (${toCheck})` : ''}`],
            ['website', 'Website'],
          ].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-5 py-2.5 text-sm font-bold ${tab === k ? 'bg-primary text-white' : ''}`}>
              {l}
            </button>
          ))}
        </div>
        {data.error && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm font-semibold text-[#7a1a12]">{data.error}</p>}

        {tab === 'accounts' ? (
          <section aria-label="Accounts">
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter accounts">
              {['pending', 'approved', 'suspended', 'rejected', 'all'].map((k) => (
                <Pill key={k} active={filter === k} onClick={() => setFilter(k)}>
                  {k[0].toUpperCase() + k.slice(1)} {k !== 'all' && `(${counts[k] || 0})`}
                </Pill>
              ))}
            </div>
            {data.profiles === null ? (
              <p className="text-muted">Loading…</p>
            ) : profiles.length === 0 ? (
              <p className="card p-6 text-muted">No accounts here.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {profiles.map((p) => (
                  <AccountCard key={p.id + p.status} p={p} owed={owedBy[p.id] || 0} onSaved={load} />
                ))}
              </ul>
            )}
          </section>
        ) : tab === 'website' ? (
          <WebsiteTab profiles={data.profiles || []} orders={data.orders || []} payments={data.payments || []} />
        ) : tab === 'payments' ? (
          <section aria-label="Payments">
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter payments">
              {[
                ['submitted', `To check (${toCheck})`],
                ['confirmed', 'Confirmed'],
                ['rejected', 'Not received'],
                ['all', 'All'],
              ].map(([k, l]) => (
                <Pill key={k} active={payFilter === k} onClick={() => setPayFilter(k)}>
                  {l}
                </Pill>
              ))}
            </div>
            {data.payments === null ? (
              <p className="text-muted">Loading…</p>
            ) : payList.length === 0 ? (
              <p className="card p-6 text-muted">No payments here.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {payList.map((x) => (
                  <PaymentRow key={x.id + x.status} p={x} onSaved={load} />
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted">Check each payment on your MoMo or Ecobank statement before confirming. Confirming applies it to the customer's invoices and issues a numbered receipt they can download.</p>
          </section>
        ) : (
          <section aria-label="Orders">
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter orders">
              {[
                ['unpaid', 'Unpaid credit'],
                ['overdue', 'Overdue'],
                ['pending', 'Awaiting confirmation'],
                ['issues', `Problems reported${issues ? ` (${issues})` : ''}`],
                ['all', 'All orders'],
              ].map(([k, l]) => (
                <Pill key={k} active={orderFilter === k} onClick={() => setOrderFilter(k)}>
                  {l}
                </Pill>
              ))}
            </div>
            {data.orders === null ? (
              <p className="text-muted">Loading…</p>
            ) : orders.length === 0 ? (
              <p className="card p-6 text-muted">No orders here.</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-sand">
                    <tr>
                      {['Order', 'Customer', 'Items', 'Payment', 'Total', 'Balance', 'Status / payments'].map((h) => (
                        <th key={h} scope="col" className="px-3 py-3 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <OrderRow key={o.id + o.amount_paid + o.status} o={o} onSaved={load} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-sm text-muted">Check item prices on each new credit order before confirming it. Money that arrives without the customer recording it (e.g. cash at the office) can be recorded here — a receipt is issued straight away.</p>
          </section>
        )}
      </div>
    </>
  )
}
