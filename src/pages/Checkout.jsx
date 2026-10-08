import { useEffect, useState } from 'react'
import site from '../data/site.json'
import { LuBuilding2, LuCheck, LuWallet, LuCopy, LuCreditCard, LuInfo, LuLock, LuMessageCircle, LuSmartphone, LuStore, LuTruck } from 'react-icons/lu'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { accounts, ACCOUNTS_MODE } from '../lib/accounts.js'

// Orders are sent to the company WhatsApp automatically by the database (see supabase/notifications.sql)
const AUTO_ALERTS = !!site.notifications?.whatsappAlerts && ACCOUNTS_MODE !== 'off'
import { deliveryFee, FREE_THRESHOLD, pickup, zoneById, zones } from '../lib/delivery.js'
import { ghs, isValidGhPhone, normaliseGhPhone } from '../lib/format.js'
import { makeOrderRef, onlinePaymentsEnabled, payOnline, verifyPayment, PROVIDER } from '../lib/payments.js'
import { Link, useRouter } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { orderMessage, waLink } from '../lib/whatsapp.js'
import Img from '../lib/Img.jsx'
import { Breadcrumbs } from '../components/ui.jsx'
import { PaymentIcons } from '../components/Footer.jsx'

function Field({ id, label, error, hint, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function Choice({ name, value, checked, onChange, icon: Icon, title, text, right }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${checked ? 'border-primary' : 'border-line hover:border-aqua'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 h-5 w-5 accent-[var(--evc-primary)]" />
      <Icon className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden="true" />
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        {text && <span className="block text-sm text-muted">{text}</span>}
      </span>
      {right && <span className="font-semibold">{right}</span>}
    </label>
  )
}

function CopyButton({ value, label }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      /* clipboard blocked — the value is still visible to copy by hand */
    }
  }
  return (
    <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-primary hover:border-primary" aria-label={`Copy ${label}`}>
      {done ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />} {done ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Step-by-step instructions for paying the company MoMo wallet directly */
function MomoPanel({ total, orderRef, form, set, errors, aria }) {
  const m = site.momo
  const rows = [
    ['Network', m.network],
    ['Number', m.display, m.number],
    ['Account name', m.accountName],
    ['Amount', ghs(total), String(total)],
    ['Reference', orderRef, orderRef],
  ]
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-aqua-soft p-5">
      <p className="font-bold">Send {ghs(total)} to our {m.network} wallet</p>
      <dl className="mt-3 divide-y divide-white rounded-xl bg-white/70">
        {rows.map(([k, v, copy]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
            <dt className="shrink-0 text-sm text-muted">{k}</dt>
            <dd className="ml-auto flex items-center gap-2 text-right font-bold tabular-nums">
              <span className={copy ? 'whitespace-nowrap' : ''}>{v}</span> {copy && <CopyButton value={copy} label={k} />}
            </dd>
          </div>
        ))}
      </dl>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Dial <strong>{m.ussd}</strong> (MTN) and choose <strong>Transfer Money → MoMo User</strong>, or use the MoMo app. From Telecel Cash or AT Money, send to an MTN number from your own menu.
        </li>
        <li>
          Enter <strong>{m.display}</strong> and the amount <strong>{ghs(total)}</strong>.
        </li>
        <li>
          Use <strong>{orderRef}</strong> as the reference.
        </li>
        <li>
          Check the name shows <strong>{m.accountName}</strong> before you enter your PIN. Never share your PIN with anyone.
        </li>
        <li>Enter the Transaction ID from your confirmation SMS below.</li>
      </ol>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="momoTxn" label="Transaction ID" error={errors.momoTxn} hint="From the MoMo SMS, e.g. 4123456789">
          <input id="momoTxn" className="field" inputMode="numeric" autoComplete="off" value={form.momoTxn} onChange={set('momoTxn')} {...aria('momoTxn', true)} />
        </Field>
        <Field id="momoFrom" label="Number you paid from" optional error={errors.momoFrom} hint="Leave blank if it's your phone number above">
          <input id="momoFrom" type="tel" className="field" placeholder="024 123 4567" value={form.momoFrom} onChange={set('momoFrom')} {...aria('momoFrom', true)} />
        </Field>
      </div>
    </div>
  )
}

const BANK_METHODS = ['Bank transfer', 'Cash deposit', 'Cheque']

/** Bank transfer, cash deposit or cheque to the company bank account */
function BankPanel({ total, orderRef, form, set, errors, aria }) {
  const b = site.bank
  const rows = [
    ['Account name', b.accountName],
    ['Bank', b.bankName],
    ['Branch', b.branch],
    ['Account number', b.accountNumber, b.accountNumber],
    ['Amount', ghs(total), String(total)],
    ['Reference', orderRef, orderRef],
  ]
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-aqua-soft p-5">
      <p className="font-bold">Pay {ghs(total)} into our {b.bankName} account</p>
      <dl className="mt-3 divide-y divide-white rounded-xl bg-white/70">
        {rows.map(([k, v, copy]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
            <dt className="shrink-0 text-sm text-muted">{k}</dt>
            <dd className="ml-auto flex items-center gap-2 text-right font-bold tabular-nums">
              <span className={copy ? 'whitespace-nowrap' : ''}>{v}</span> {copy && <CopyButton value={copy} label={k} />}
            </dd>
          </div>
        ))}
      </dl>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-bold">How are you paying?</legend>
        <div className="flex flex-wrap gap-2">
          {BANK_METHODS.map((m) => (
            <label key={m} className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${form.bankMethod === m ? 'border-primary bg-primary text-white' : 'border-line bg-white'}`}>
              <input type="radio" name="bankMethod" value={m} checked={form.bankMethod === m} onChange={set('bankMethod')} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </fieldset>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
        {form.bankMethod === 'Bank transfer' && (
          <li>
            Transfer from your bank app or internet banking to the account above. Use <strong>{orderRef}</strong> as the reference.
          </li>
        )}
        {form.bankMethod === 'Cash deposit' && (
          <li>
            Deposit cash at any {b.bankName} branch into the account above. Write <strong>{orderRef}</strong> on the deposit slip.
          </li>
        )}
        {form.bankMethod === 'Cheque' && (
          <li>
            Make the cheque payable to <strong>{b.accountName}</strong> and deposit it into the account above, or hand it to our delivery team. Orders paid by cheque are dispatched once the cheque has cleared.
          </li>
        )}
        <li>Send a photo of your receipt, deposit slip or cheque on WhatsApp after placing your order.</li>
      </ul>
      <div className="mt-4">
        <Field id="bankRef" label={form.bankMethod === 'Cheque' ? 'Cheque number' : form.bankMethod === 'Cash deposit' ? 'Deposit slip number' : 'Transfer reference'} optional error={errors.bankRef} hint="You can also send this later on WhatsApp">
          <input id="bankRef" className="field" autoComplete="off" value={form.bankRef} onChange={set('bankRef')} {...aria('bankRef', true)} />
        </Field>
      </div>
    </div>
  )
}

export default function Checkout() {
  useSeo({ title: 'Checkout', noindex: true })
  const { lines, subtotal, clear, ready } = useCart()
  const { navigate } = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', method: 'delivery', zone: zones[0]?.id, address: '', gps: '', notes: '', payment: site.momo?.enabled ? 'momo' : 'whatsapp', momoTxn: '', momoFrom: '', bankMethod: 'Bank transfer', bankRef: '' })
  const [orderRef] = useState(() => makeOrderRef())
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [payError, setPayError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const auth = useAuth()
  const profile = auth?.profile

  // Logged-in customers: fill in their saved details, and default to credit if approved
  useEffect(() => {
    if (!profile) return
    const local = (profile.phone || '').replace(/^\+233/, '0')
    setForm((f) => ({
      ...f,
      name: f.name || profile.full_name || '',
      phone: f.phone || local,
      email: f.email || profile.email || '',
      address: f.address || [profile.business_name, profile.address, profile.city].filter(Boolean).join(', '),
      gps: f.gps || profile.gps || '',
      payment: profile.status === 'approved' && profile.credit_limit > 0 ? 'credit' : f.payment,
    }))
  }, [profile])

  const fee = deliveryFee({ method: form.method, zoneId: form.zone, subtotal })
  const total = subtotal + (fee || 0)
  const zone = zoneById(form.zone)
  const online = onlinePaymentsEnabled()
  const credit = auth?.summary
  const creditProblem = !auth?.isApproved
    ? null
    : !credit || credit.credit_limit <= 0
      ? 'No credit limit has been set on your account yet.'
      : credit.overdue > 0
        ? `You have an overdue balance of ${ghs(credit.overdue)}. Please settle it to buy on credit again.`
        : total > credit.available
          ? `This order is more than your available credit (${ghs(credit.available)}).`
          : null

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />
  if (lines.length === 0) {
    return (
      <section className="container-x py-24 text-center">
        <h1 className="text-4xl">Your cart is empty</h1>
        <p className="mt-3 text-muted">Add some products before checking out.</p>
        <Link to="/shop" className="btn btn-primary mt-6">
          Shop all products
        </Link>
      </section>
    )
  }

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Please enter your full name.'
    if (!isValidGhPhone(form.phone)) e.phone = 'Enter a valid Ghana mobile number, e.g. 024 123 4567.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Please enter a valid email address, or leave it blank.'
    if (form.method === 'delivery' && form.address.trim().length < 4) e.address = 'Please enter your delivery address or area and a landmark.'
    if (form.gps && !/^[A-Z]{2}-?\d{3,4}-?\d{3,4}$/i.test(form.gps.trim())) e.gps = 'GhanaPost GPS looks like GA-123-4567. Leave blank if unsure.'
    if (form.payment === 'online' && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Please enter your email address. Your card payment receipt is sent there.'
    if (form.payment === 'momo') {
      if (!/^[A-Za-z0-9.\-]{6,}$/.test(form.momoTxn.trim())) e.momoTxn = 'Enter the Transaction ID from your MoMo confirmation SMS.'
      if (form.momoFrom && !isValidGhPhone(form.momoFrom)) e.momoFrom = 'Enter a valid Ghana number, or leave it blank.'
    }
    setErrors(e)
    if (Object.keys(e).length) {
      setTimeout(() => document.getElementById(Object.keys(e)[0])?.focus(), 30)
      return false
    }
    return true
  }

  const items = lines.map((l) => ({ name: l.name, variantLabel: l.variantLabel, qty: l.qty, price: l.price }))
  const customer = { ...form, phone: normaliseGhPhone(form.phone) || form.phone }

  const saveOrder = (extra) => {
    try {
      sessionStorage.setItem('evaclear-last-order', JSON.stringify({ items, subtotal, fee, total, method: form.method, zone: zone?.name, estimate: form.method === 'pickup' ? pickup.estimate : zone?.estimate, name: form.name, ...extra }))
    } catch {
      /* ignore */
    }
  }

  const deliveryInfo = { method: form.method, zone: zone?.name, address: form.address, gps: form.gps, notes: form.notes, name: form.name, phone: customer.phone }

  /*
   * Finish a non-credit order.
   * With automatic alerts on, the order is saved to the database, which sends a copy to the
   * company WhatsApp by itself. If that fails (or alerts are off), WhatsApp opens for the
   * customer to send the order instead.
   */
  const finish = async ({ paymentMethod, paymentRef, message, extra }) => {
    const url = waLink(message)
    let notified = false
    if (AUTO_ALERTS) {
      setBusy(true)
      try {
        await accounts.submitOrder({
          ref: orderRef,
          items,
          subtotal,
          deliveryFee: fee || 0,
          paymentMethod,
          paymentRef,
          delivery: deliveryInfo,
          customer: { name: form.name, phone: customer.phone, email: form.email || null },
        })
        notified = true
      } catch {
        notified = false
      } finally {
        setBusy(false)
      }
    } else {
      window.open(url, '_blank', 'noopener')
    }
    saveOrder({ orderRef, payment: paymentMethod, waUrl: url, notified, ...extra })
    clear()
    navigate(`/order-confirmed?ref=${orderRef}`)
  }

  const submit = async (e) => {
    e.preventDefault()
    setPayError('')
    if (!validate()) return
    if (form.payment === 'credit') {
      if (creditProblem) return setPayError(creditProblem)
      setBusy(true)
      try {
        const order = await accounts.placeCreditOrder({ ref: orderRef, items, subtotal, deliveryFee: fee || 0, delivery: deliveryInfo })
        const msg = orderMessage({ items, subtotal, fee, total, customer, method: form.method, zoneName: zone?.name, orderRef, credit: { business: profile?.business_name || profile?.full_name, dueDate: order?.due_date } })
        saveOrder({ orderRef, payment: 'credit', dueDate: order?.due_date, waUrl: waLink(msg), notified: AUTO_ALERTS })
        auth.refresh()
        clear()
        navigate(`/order-confirmed?ref=${orderRef}`)
      } catch (err) {
        setPayError(err.message || 'We could not place this order on credit. Please try another payment option.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (form.payment === 'momo') {
      const m = site.momo
      const momo = { network: m.network, to: m.display, accountName: m.accountName, transactionId: form.momoTxn.trim(), from: normaliseGhPhone(form.momoFrom || form.phone) }
      return finish({
        paymentMethod: 'momo',
        paymentRef: `${momo.transactionId}${momo.from && momo.from !== customer.phone ? ` (paid from ${momo.from})` : ''}`,
        message: orderMessage({ items, subtotal, fee, total, customer, method: form.method, zoneName: zone?.name, orderRef, momo }),
        extra: { momoTxn: momo.transactionId },
      })
    }
    if (form.payment === 'bank') {
      const bank = { ...site.bank, method: form.bankMethod.toLowerCase(), reference: form.bankRef.trim() }
      return finish({
        paymentMethod: 'bank',
        paymentRef: [form.bankMethod, form.bankRef.trim()].filter(Boolean).join(' '),
        message: orderMessage({ items, subtotal, fee, total, customer, method: form.method, zoneName: zone?.name, orderRef, bank }),
        extra: { bankMethod: form.bankMethod },
      })
    }
    if (form.payment === 'whatsapp') {
      return finish({ paymentMethod: 'whatsapp', message: orderMessage({ items, subtotal, fee, total, customer, method: form.method, zoneName: zone?.name, orderRef }) })
    }
    setBusy(true)
    try {
      const res = await payOnline({ amount: total, email: form.email, phone: customer.phone, name: form.name, reference: orderRef, items: items.map((i) => `${i.qty}x ${i.name} (${i.variantLabel})`).join(', ') })
      const check = await verifyPayment(res).catch(() => ({ verified: false }))
      await finish({
        paymentMethod: 'online',
        paymentRef: res.reference,
        message: orderMessage({ items, subtotal, fee, total, customer, method: form.method, zoneName: zone?.name, orderRef, online: { reference: res.reference } }),
        extra: { provider: res.provider, verified: check.verified },
      })
    } catch (err) {
      setPayError(err.message || 'Payment did not go through. Please try again or order via WhatsApp.')
    } finally {
      setBusy(false)
    }
  }

  const aria = (k, hint) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : hint ? `${k}-hint` : undefined })

  return (
    <div className="container-x pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/shop' }, { label: 'Checkout' }]} />
      <h1 className="text-4xl">Checkout</h1>
      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="flex flex-col gap-10">
          {Object.keys(errors).length > 0 && (
            <div role="alert" className="rounded-2xl border-2 border-danger/30 bg-[#fdecea] p-4 text-[#7a1a12]">
              Please fix the {Object.keys(errors).length} highlighted field{Object.keys(errors).length > 1 ? 's' : ''} below.
            </div>
          )}

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-heading text-2xl">1. Your details</legend>
            <Field id="name" label="Full name" error={errors.name}>
              <input id="name" className="field" autoComplete="name" value={form.name} onChange={set('name')} {...aria('name')} />
            </Field>
            <Field id="phone" label="Phone (MoMo / WhatsApp number)" error={errors.phone} hint="We'll call or WhatsApp you to confirm delivery.">
              <div className="flex">
                <span className="grid place-items-center rounded-l-[.85rem] border-[1.5px] border-r-0 border-line bg-sand px-3 font-semibold" aria-hidden="true">
                  +233
                </span>
                <input id="phone" type="tel" inputMode="tel" className="field rounded-l-none" autoComplete="tel-national" placeholder="24 123 4567" value={form.phone} onChange={set('phone')} {...aria('phone', true)} />
              </div>
            </Field>
            <Field id="email" label="Email" optional error={errors.email} hint="For your receipt.">
              <input id="email" type="email" className="field" autoComplete="email" value={form.email} onChange={set('email')} {...aria('email', true)} />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-heading text-2xl">2. Delivery</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice name="method" value="delivery" checked={form.method === 'delivery'} onChange={set('method')} icon={LuTruck} title="Deliver to me" text="Fees by area, shown below" />
              {pickup.enabled && <Choice name="method" value="pickup" checked={form.method === 'pickup'} onChange={set('method')} icon={LuStore} title="Pick up (free)" text={pickup.estimate} />}
            </div>
            {form.method === 'delivery' ? (
              <>
                <Field id="zone" label="Delivery area">
                  <select id="zone" className="field" value={form.zone} onChange={set('zone')}>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {z.freeAboveThreshold && subtotal >= FREE_THRESHOLD ? 'FREE' : ghs(z.fee)}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="-mt-2 flex items-start gap-2 rounded-xl bg-aqua-soft p-3 text-sm">
                  <LuInfo className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <strong>Estimated delivery:</strong> {zone?.estimate}.
                    {zone?.freeAboveThreshold && subtotal < FREE_THRESHOLD && ` Add ${ghs(FREE_THRESHOLD - subtotal)} more for free delivery.`}
                  </span>
                </p>
                <Field id="address" label="Address, area and nearest landmark" error={errors.address}>
                  <textarea id="address" rows={3} className="field" autoComplete="street-address" placeholder="e.g. House 12, Ahodwo Roundabout Road, Kumasi — near the Shell station" value={form.address} onChange={set('address')} {...aria('address')} />
                </Field>
                <Field id="gps" label="GhanaPost GPS address" optional error={errors.gps} hint="e.g. GA-123-4567">
                  <input id="gps" className="field uppercase" value={form.gps} onChange={set('gps')} {...aria('gps', true)} />
                </Field>
              </>
            ) : (
              <p className="rounded-xl bg-aqua-soft p-4 text-sm">
                <strong>Pickup address:</strong> {pickup.address}. We'll message you when your order is ready.
              </p>
            )}
            <Field id="notes" label="Order notes" optional>
              <textarea id="notes" rows={2} className="field" value={form.notes} onChange={set('notes')} placeholder="Preferred delivery time, scent swaps, etc." />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4 font-heading text-2xl">3. Payment</legend>
            {auth?.enabled && auth.isApproved && (
              <>
                <Choice
                  name="payment"
                  value="credit"
                  checked={form.payment === 'credit'}
                  onChange={set('payment')}
                  icon={LuWallet}
                  title="Buy on credit"
                  text={credit ? `Pay within ${credit.payment_terms_days} days. Available credit: ${ghs(credit.available)}.` : 'Pay later on your approved account.'}
                />
                {form.payment === 'credit' && creditProblem && (
                  <p role="alert" className="rounded-xl bg-[#fdecea] p-3 text-sm font-semibold text-[#7a1a12]">
                    {creditProblem} Choose another payment option, or{' '}
                    <a href={waLink(`Hello Evaclear! I'd like to discuss my credit account (${profile?.email}).`)} target="_blank" rel="noopener noreferrer" className="underline">
                      contact us
                    </a>
                    .
                  </p>
                )}
              </>
            )}
            {auth?.enabled && !auth.loading && !auth.user && (
              <p className="rounded-xl bg-sand p-3 text-sm">
                Business or institution?{' '}
                <Link to="/account/login" className="font-semibold text-primary underline">
                  Log in
                </Link>{' '}
                or{' '}
                <Link to="/account/register" className="font-semibold text-primary underline">
                  apply for a credit account
                </Link>{' '}
                to buy now and pay later.
              </p>
            )}
            {auth?.enabled && auth.user && auth.profile?.status === 'pending' && (
              <p className="rounded-xl bg-[#fff4d6] p-3 text-sm text-[#5c3d00]">Your account is waiting for approval. Buying on credit opens once it's approved.</p>
            )}
            {site.momo?.enabled && (
              <Choice name="payment" value="momo" checked={form.payment === 'momo'} onChange={set('payment')} icon={LuSmartphone} title={`Pay now with Mobile Money`} text={`Send to our ${site.momo.network} number ${site.momo.display}, then enter the Transaction ID.`} />
            )}
            {form.payment === 'momo' && site.momo?.enabled && <MomoPanel total={total} orderRef={orderRef} form={form} set={set} errors={errors} aria={aria} />}
            {site.bank?.enabled && (
              <Choice name="payment" value="bank" checked={form.payment === 'bank'} onChange={set('payment')} icon={LuBuilding2} title="Bank transfer, cash deposit or cheque" text={`Pay into our ${site.bank.bankName} account (${site.bank.branch}).`} />
            )}
            {form.payment === 'bank' && site.bank?.enabled && <BankPanel total={total} orderRef={orderRef} form={form} set={set} errors={errors} aria={aria} />}
            <Choice name="payment" value="whatsapp" checked={form.payment === 'whatsapp'} onChange={set('payment')} icon={LuMessageCircle} title="Order on WhatsApp, pay later" text="We confirm your order on WhatsApp first, then you pay by MoMo." />
            {online && (
              <Choice
                name="payment"
                value="online"
                checked={form.payment === 'online'}
                onChange={set('payment')}
                icon={LuCreditCard}
                title="Pay online now"
                text={`Visa/Mastercard or Mobile Money, paid securely into our ${site.bank?.bankName || 'bank'} account.`}
              />
            )}
            <PaymentIcons />
          </fieldset>
        </div>

        <aside aria-labelledby="summary-title" className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 id="summary-title" className="text-2xl">
              Order summary
            </h2>
            <ul className="mt-4 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3 py-3">
                  <span className="relative shrink-0">
                    <Img src={l.image} alt="" className="h-14 w-14 rounded-xl bg-white" sizesAttr="56px" />
                    <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-white">{l.qty}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="text-muted">{l.variantLabel}</span>
                  </span>
                  <span className="text-sm font-semibold">{ghs(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{ghs(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{form.method === 'pickup' ? 'Pickup' : `Delivery (${zone?.name})`}</dt>
                <dd>{fee === 0 ? 'FREE' : ghs(fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-xl font-bold">
                <dt>Total</dt>
                <dd>{ghs(total)}</dd>
              </div>
            </dl>
            {payError && (
              <p role="alert" className="mt-4 rounded-xl bg-[#fdecea] p-3 text-sm font-semibold text-[#7a1a12]">
                {payError}
              </p>
            )}
            <button type="submit" disabled={busy || (form.payment === 'online' && !online) || (form.payment === 'credit' && !!creditProblem)} className={`btn mt-6 w-full ${form.payment === 'online' ? 'btn-primary' : 'btn-whatsapp'}`}>
              {form.payment === 'credit' ? (
                <>
                  <LuWallet aria-hidden="true" /> {busy ? 'Placing order…' : `Place order on credit · ${ghs(total)}`}
                </>
              ) : form.payment === 'momo' ? (
                <>
                  <LuCheck aria-hidden="true" /> I've paid — send my order
                </>
              ) : form.payment === 'bank' ? (
                <>
                  <LuCheck aria-hidden="true" /> Send my order
                </>
              ) : form.payment === 'whatsapp' ? (
                <>
                  <LuMessageCircle aria-hidden="true" /> {AUTO_ALERTS ? 'Place order' : 'Send order on WhatsApp'}
                </>
              ) : (
                <>
                  <LuLock aria-hidden="true" /> {busy ? 'Opening secure payment…' : `Pay ${ghs(total)}`}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              {form.payment === 'online'
                ? `Payments processed securely by ${PROVIDER === 'flutterwave' ? 'Flutterwave' : 'Paystack'}.`
                : form.payment === 'credit'
                  ? 'Your order goes straight to our team. Pay by the due date shown in your account.'
                  : AUTO_ALERTS
                  ? 'Your order goes straight to our team on WhatsApp. We confirm your payment before dispatch.'
                  : form.payment === 'momo' || form.payment === 'bank'
                    ? 'WhatsApp opens with your order and payment details. We confirm your payment before dispatch.'
                    : 'WhatsApp opens with your order ready to send.'}{' '}
              By ordering you agree to our{' '}
              <Link to="/terms" className="underline">
                Terms
              </Link>
              .
            </p>
          </div>
        </aside>
      </form>
    </div>
  )
}
