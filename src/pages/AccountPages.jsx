// Customer accounts: log in, register (individual or institution), reset password, dashboard
import { useCallback, useEffect, useState } from 'react'
import { LuBuilding2, LuCircleAlert, LuClock, LuFileText, LuLogOut, LuPackageCheck, LuReceipt, LuShieldCheck, LuUser, LuWallet } from 'react-icons/lu'
import site from '../data/site.json'
import { useAuth } from '../context/AuthContext.jsx'
import { accounts, ACCOUNTS_MODE } from '../lib/accounts.js'
import { formatDate, ghs, isValidGhPhone, normaliseGhPhone, prettyGhPhone } from '../lib/format.js'
import { Link, useRouter, useSearchParams } from '../lib/router.jsx'
import { balanceOf, CUSTOMER_PAY_METHODS, daysOverdue, INVOICE_STATE, invoiceNo, invoiceState, money, PAY_METHOD, PAYMENT_STATUS, REF_LABEL, todayISO } from '../lib/credit.js'
import { useSeo } from '../lib/seo.jsx'
import { waLink } from '../lib/whatsapp.js'
import { PageHero } from '../components/ui.jsx'
import { AccountOffline } from './Info.jsx'
import { BUSINESS_TYPES } from './Support.jsx'

/* ── shared bits ───────────────────────────────────────────────────────── */

export const STATUS = {
  pending: { label: 'Pending review', cls: 'bg-[#fff4d6] text-[#7a5200]' },
  approved: { label: 'Approved', cls: 'bg-aqua text-ink' },
  rejected: { label: 'Not approved', cls: 'bg-[#fdecea] text-[#7a1a12]' },
  suspended: { label: 'Suspended', cls: 'bg-[#fdecea] text-[#7a1a12]' },
}
export const ORDER_STATUS = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
export const METHOD = { credit: 'On credit', momo: 'Mobile Money', bank: 'Bank / cheque', whatsapp: 'WhatsApp order', online: 'Online payment' }

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
}

function DemoBanner() {
  if (ACCOUNTS_MODE !== 'demo') return null
  return (
    <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-dashed border-muted bg-white p-3 text-sm">
      <strong>Demo mode:</strong> accounts are saved only in this browser so you can try the flow. To see the staff view, log in as <strong>admin@demo.com</strong> with password <strong>demo1234</strong>.
    </p>
  )
}

function Field({ id, label, error, hint, optional, children, className = '' }) {
  return (
    <div className={className}>
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
const a11y = (errors, k, hint) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : hint ? `${k}-hint` : undefined })

function Notice({ tone = 'error', children }) {
  const cls = tone === 'error' ? 'bg-[#fdecea] text-[#7a1a12]' : 'bg-aqua-soft text-ink'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm font-semibold ${cls}`}>
      {children}
    </p>
  )
}

function Loading() {
  return (
    <div className="container-x min-h-[50vh] py-24 text-center text-muted" aria-busy="true">
      Loading your account…
    </div>
  )
}

/* ── Log in ────────────────────────────────────────────────────────────── */

export function LoginForm({ onDone }) {
  const auth = useAuth()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!/^\S+@\S+\.\S+$/.test(f.email) || !f.password) return setErr('Enter your email and password.')
    setBusy(true)
    try {
      await auth.signIn(f.email.trim(), f.password)
      onDone?.()
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
    }
  }
  const forgot = async () => {
    setErr('')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Type your email address above first, then tap "Forgot password".')
    try {
      await accounts.resetPassword(f.email.trim())
      setResetSent(true)
    } catch (x) {
      setErr(x.message)
    }
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id="login-email" label="Email">
        <input id="login-email" type="email" autoComplete="email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </Field>
      <Field id="login-password" label="Password">
        <input id="login-password" type="password" autoComplete="current-password" className="field" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </Field>
      {err && <Notice>{err}</Notice>}
      {resetSent && <Notice tone="ok">If an account exists for {f.email}, we've emailed a link to reset your password.</Notice>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <button type="button" onClick={forgot} className="self-start text-sm font-semibold text-primary underline">
        Forgot password?
      </button>
    </form>
  )
}

export function LoginPage() {
  useSeo({ title: 'Log in', noindex: true })
  const auth = useAuth()
  const { navigate, pathname } = useRouter()
  const next = useSearchParams().get('next')
  useEffect(() => {
    // Only the /account/login page redirects; other pages show this form in place and stay put after login
    if (auth.user && pathname.replace(/\/$/, '') === '/account/login') navigate(next && /^\/[^/]/.test(next) ? next : '/account', { replace: true })
  }, [auth.user, navigate, pathname, next])
  if (!auth.enabled) return <AccountOffline />
  return (
    <>
      <PageHero eyebrow="My account" title="Log in" intro="Track your orders, see your credit balance and reorder quickly.">
        <DemoBanner />
      </PageHero>
      <section className="container-x grid max-w-4xl gap-8 py-12 md:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 className="mb-5 text-2xl">Welcome back</h2>
          <LoginForm />
        </div>
        <div className="card flex flex-col p-6 sm:p-8">
          <h2 className="text-2xl">New here?</h2>
          <p className="mt-2 text-muted">Create a free account for faster checkout and order history. Businesses and institutions can also apply to buy on credit.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2">
              <LuWallet className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> Buy now, pay within your agreed credit terms
            </li>
            <li className="flex gap-2">
              <LuClock className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> See all your orders and balances in one place
            </li>
            <li className="flex gap-2">
              <LuShieldCheck className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> Every credit account is reviewed and approved by our team
            </li>
          </ul>
          <Link to="/account/register" className="btn btn-outline mt-6 self-start">
            Create an account
          </Link>
        </div>
      </section>
    </>
  )
}

/* ── Register ──────────────────────────────────────────────────────────── */

const blank = {
  account_type: 'institution',
  full_name: '',
  phone: '',
  email: '',
  password: '',
  password2: '',
  business_name: '',
  business_type: BUSINESS_TYPES[0],
  registration_number: '',
  contact_role: '',
  address: '',
  city: site.address.city,
  gps: '',
  requested_credit: '',
  agree: false,
}

export function RegisterPage() {
  useSeo({ title: 'Create an account', noindex: true })
  const auth = useAuth()
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [done, setDone] = useState(null)
  if (!auth.enabled) return <AccountOffline />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const inst = f.account_type === 'institution'

  const submit = async (e) => {
    e.preventDefault()
    setFailure('')
    const x = {}
    if (f.full_name.trim().length < 2) x.full_name = 'Please enter your full name.'
    if (!isValidGhPhone(f.phone)) x.phone = 'Enter a valid Ghana number, e.g. 024 123 4567.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Please enter a valid email address.'
    if (f.password.length < 8) x.password = 'Use at least 8 characters.'
    if (f.password2 !== f.password) x.password2 = 'The passwords do not match.'
    if (inst && f.business_name.trim().length < 2) x.business_name = 'Please enter the business or institution name.'
    if (f.address.trim().length < 4) x.address = 'Please enter your address or area.'
    if (f.gps && !/^[A-Z]{2}-?\d{3,4}-?\d{3,4}$/i.test(f.gps.trim())) x.gps = 'Digital address looks like AK-123-4567. Leave blank if unsure.'
    if (f.requested_credit && !(Number(f.requested_credit) >= 0)) x.requested_credit = 'Enter an amount in cedis, e.g. 5000.'
    if (!f.agree) x.agree = 'Please accept the account and credit terms.'
    setErrors(x)
    if (Object.keys(x).length) return document.getElementById(Object.keys(x)[0])?.focus()
    setBusy(true)
    try {
      const meta = {
        account_type: f.account_type,
        full_name: f.full_name.trim(),
        phone: normaliseGhPhone(f.phone),
        business_name: inst ? f.business_name.trim() : '',
        business_type: inst ? f.business_type : '',
        registration_number: inst ? f.registration_number.trim() : '',
        contact_role: inst ? f.contact_role.trim() : '',
        address: f.address.trim(),
        city: f.city.trim(),
        gps: f.gps.trim().toUpperCase(),
        requested_credit: f.requested_credit ? String(Number(f.requested_credit)) : '0',
      }
      const r = await auth.signUp(f.email.trim(), f.password, meta)
      setDone({ ...meta, email: f.email.trim(), needsConfirmation: r.needsConfirmation })
      window.scrollTo(0, 0)
    } catch (x2) {
      setFailure(x2.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const msg = [
      'Hello Evaclear! I have just applied for an account on your website.',
      `Name: ${done.full_name}`,
      done.business_name ? `Business: ${done.business_name} (${done.business_type})` : null,
      `Phone: ${done.phone}`,
      `Email: ${done.email}`,
      Number(done.requested_credit) > 0 ? `Requested credit limit: ${ghs(Number(done.requested_credit))}` : null,
      'Please review my account. Thank you!',
    ]
      .filter(Boolean)
      .join('\n')
    return (
      <section className="container-x max-w-2xl py-16 text-center">
        <LuShieldCheck size={56} className="mx-auto text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-4xl">Application received</h1>
        {site.notifications?.whatsappAlerts && <p className="mt-2 font-semibold text-primary">Our team has been notified on WhatsApp.</p>}
        {done.needsConfirmation ? (
          <p className="mt-4 text-muted">
            We've sent a confirmation link to <strong>{done.email}</strong>. Click it to activate your login. Our team will then review your account, usually within 1–2 working days.
          </p>
        ) : (
          <p className="mt-4 text-muted">Your account has been created. Our team will review it, usually within 1–2 working days. You can shop and pay by Mobile Money or bank right away; buying on credit opens once you're approved.</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {site.notifications?.whatsappAlerts ? (
            <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Chat with us on WhatsApp (optional)
            </a>
          ) : (
            <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
              Speed up approval on WhatsApp
            </a>
          )}
          <Link to={done.needsConfirmation ? '/account/login' : '/account'} className="btn btn-outline">
            {done.needsConfirmation ? 'Go to log in' : 'Go to my account'}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <>
      <PageHero eyebrow="My account" title="Create an account" intro="Open an account for faster checkout and order history. Businesses and institutions can apply to buy on credit.">
        <DemoBanner />
      </PageHero>
      <section className="container-x max-w-3xl py-12">
        <form onSubmit={submit} noValidate className="card flex flex-col gap-8 p-6 sm:p-8">
          <fieldset>
            <legend className="mb-3 font-heading text-2xl">Account type</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { v: 'institution', Icon: LuBuilding2, t: 'Business or institution', d: 'Hotels, hospitals, schools, offices, shops, wholesalers and distributors' },
                { v: 'individual', Icon: LuUser, t: 'Individual / household', d: 'For your home and family' },
              ].map(({ v, Icon, t, d }) => (
                <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${f.account_type === v ? 'border-primary' : 'border-line hover:border-aqua'}`}>
                  <input type="radio" name="account_type" value={v} checked={f.account_type === v} onChange={set('account_type')} className="mt-1 h-5 w-5 accent-[var(--evc-primary)]" />
                  <Icon className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden="true" />
                  <span>
                    <span className="block font-bold">{t}</span>
                    <span className="block text-sm text-muted">{d}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {inst && (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 font-heading text-2xl">Business details</legend>
              <Field id="business_name" label="Business / institution name" error={errors.business_name} className="sm:col-span-2">
                <input id="business_name" className="field" autoComplete="organization" value={f.business_name} onChange={set('business_name')} {...a11y(errors, 'business_name')} />
              </Field>
              <Field id="business_type" label="Type">
                <select id="business_type" className="field" value={f.business_type} onChange={set('business_type')}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field id="registration_number" label="Registration no. or TIN" optional hint="Helps us approve credit faster">
                <input id="registration_number" className="field" value={f.registration_number} onChange={set('registration_number')} {...a11y(errors, 'registration_number', true)} />
              </Field>
            </fieldset>
          )}

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-heading text-2xl">{inst ? 'Contact person' : 'Your details'}</legend>
            <Field id="full_name" label="Full name" error={errors.full_name}>
              <input id="full_name" className="field" autoComplete="name" value={f.full_name} onChange={set('full_name')} {...a11y(errors, 'full_name')} />
            </Field>
            {inst ? (
              <Field id="contact_role" label="Your position" optional>
                <input id="contact_role" className="field" placeholder="e.g. Purchasing officer" value={f.contact_role} onChange={set('contact_role')} />
              </Field>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Field id="phone" label="Phone (+233)" error={errors.phone}>
              <input id="phone" type="tel" className="field" autoComplete="tel" placeholder="024 123 4567" value={f.phone} onChange={set('phone')} {...a11y(errors, 'phone')} />
            </Field>
            <Field id="address" label="Address / area" error={errors.address}>
              <input id="address" className="field" autoComplete="street-address" value={f.address} onChange={set('address')} {...a11y(errors, 'address')} />
            </Field>
            <Field id="city" label="Town / city">
              <input id="city" className="field" autoComplete="address-level2" value={f.city} onChange={set('city')} />
            </Field>
            <Field id="gps" label="Digital address" optional error={errors.gps} hint="e.g. AK-123-4567">
              <input id="gps" className="field uppercase" value={f.gps} onChange={set('gps')} {...a11y(errors, 'gps', true)} />
            </Field>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-heading text-2xl">Credit</legend>
            <Field id="requested_credit" label="Credit limit you'd like (GH₵)" optional error={errors.requested_credit} hint="Leave blank if you don't need credit. We'll confirm the limit and payment terms when we approve your account." className="sm:col-span-2">
              <input id="requested_credit" inputMode="numeric" className="field sm:max-w-xs" placeholder="e.g. 5000" value={f.requested_credit} onChange={set('requested_credit')} {...a11y(errors, 'requested_credit', true)} />
            </Field>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-heading text-2xl">Login</legend>
            <Field id="email" label="Email" error={errors.email} className="sm:col-span-2">
              <input id="email" type="email" className="field" autoComplete="email" value={f.email} onChange={set('email')} {...a11y(errors, 'email')} />
            </Field>
            <Field id="password" label="Password" error={errors.password} hint="At least 8 characters">
              <input id="password" type="password" className="field" autoComplete="new-password" value={f.password} onChange={set('password')} {...a11y(errors, 'password', true)} />
            </Field>
            <Field id="password2" label="Confirm password" error={errors.password2}>
              <input id="password2" type="password" className="field" autoComplete="new-password" value={f.password2} onChange={set('password2')} {...a11y(errors, 'password2')} />
            </Field>
          </fieldset>

          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input id="agree" type="checkbox" checked={f.agree} onChange={set('agree')} className="mt-1 h-5 w-5 accent-[var(--evc-primary)]" {...a11y(errors, 'agree')} />
              <span className="text-sm">
                I confirm these details are correct and I agree to the{' '}
                <Link to="/terms" className="font-semibold text-primary underline">
                  terms
                </Link>
                , including paying credit orders in full by their due date.
              </span>
            </label>
            {errors.agree && (
              <p id="agree-err" className="mt-1 text-sm font-semibold text-danger">
                {errors.agree}
              </p>
            )}
          </div>

          {failure && <Notice>{failure}</Notice>}
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
            <span className="text-sm text-muted">
              Already have an account?{' '}
              <Link to="/account/login" className="font-semibold text-primary underline">
                Log in
              </Link>
            </span>
          </div>
        </form>
      </section>
    </>
  )
}

/* ── Reset password (link from email) ──────────────────────────────────── */

export function ResetPasswordPage() {
  useSeo({ title: 'Set a new password', noindex: true })
  const auth = useAuth()
  const { navigate } = useRouter()
  const [pw, setPw] = useState({ a: '', b: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (!auth.enabled) return <AccountOffline />
  if (auth.loading) return <Loading />
  const submit = async (e) => {
    e.preventDefault()
    if (pw.a.length < 8) return setMsg('Use at least 8 characters.')
    if (pw.a !== pw.b) return setMsg('The passwords do not match.')
    setBusy(true)
    try {
      await accounts.updatePassword(pw.a)
      navigate('/account')
    } catch (x) {
      setMsg(x.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="container-x max-w-md py-16">
      <h1 className="text-4xl">Set a new password</h1>
      {!auth.user ? (
        <p className="mt-4 text-muted">
          This reset link has expired. Go to{' '}
          <Link to="/account/login" className="font-semibold text-primary underline">
            Log in
          </Link>{' '}
          and tap "Forgot password" to get a new one.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="card mt-6 flex flex-col gap-4 p-6">
          <Field id="new-pw" label="New password" hint="At least 8 characters">
            <input id="new-pw" type="password" autoComplete="new-password" className="field" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
          </Field>
          <Field id="new-pw2" label="Confirm new password">
            <input id="new-pw2" type="password" autoComplete="new-password" className="field" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
          </Field>
          {msg && <Notice>{msg}</Notice>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save new password
          </button>
        </form>
      )}
    </section>
  )
}

/* ── Account dashboard ─────────────────────────────────────────────────── */

function Tile({ label, value, tone }) {
  return (
    <div className={`rounded-2xl p-5 ${tone === 'warn' ? 'bg-[#fdecea]' : 'bg-white'} shadow-sm`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-heading text-2xl tabular-nums">{value}</p>
    </div>
  )
}

function ProfileEditor({ profile }) {
  const auth = useAuth()
  const [f, setF] = useState({ phone: prettyGhPhone(profile.phone) || '', address: profile.address || '', city: profile.city || '', gps: profile.gps || '' })
  const [msg, setMsg] = useState('')
  const save = async (e) => {
    e.preventDefault()
    if (!isValidGhPhone(f.phone)) return setMsg('Enter a valid Ghana phone number.')
    try {
      await auth.updateProfile({ ...f, phone: normaliseGhPhone(f.phone), gps: f.gps.toUpperCase() })
      setMsg('Saved.')
    } catch (x) {
      setMsg(x.message)
    }
  }
  return (
    <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id="pf-phone" label="Phone">
        <input id="pf-phone" type="tel" className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>
      <Field id="pf-city" label="Town / city">
        <input id="pf-city" className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      </Field>
      <Field id="pf-address" label="Address / area">
        <input id="pf-address" className="field" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </Field>
      <Field id="pf-gps" label="Digital address" optional>
        <input id="pf-gps" className="field uppercase" value={f.gps} onChange={(e) => setF({ ...f, gps: e.target.value })} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-outline">
          Save details
        </button>
        {msg && (
          <span role="status" className="text-sm font-semibold">
            {msg}
          </span>
        )}
      </div>
    </form>
  )
}

/* ── Record a payment (customer) ───────────────────────────────────────── */

function PaymentForm({ openOrders, preselect, onDone, onCancel }) {
  const outstanding = money(openOrders.reduce((t, o) => t + balanceOf(o), 0))
  const pre = openOrders.find((o) => o.id === preselect)
  const [f, setF] = useState({ orderId: pre?.id || '', amount: String(pre ? balanceOf(pre) : outstanding || ''), method: 'momo', reference: '', paidOn: todayISO(), note: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const chooseInvoice = (e) => {
    const id = e.target.value
    const o = openOrders.find((x) => x.id === id)
    setF((x) => ({ ...x, orderId: id, amount: String(o ? balanceOf(o) : outstanding) }))
  }
  const submit = async (e) => {
    e.preventDefault()
    setFailure('')
    const amount = Number(String(f.amount).replace(/[^\d.]/g, ''))
    const er = {}
    if (!(amount > 0)) er['pay-amount'] = 'Enter the amount you paid.'
    else if (amount > outstanding + 0.009) er['pay-amount'] = `You owe ${ghs(outstanding, { decimals: 2 })} in total. Enter that amount or less.`
    if (f.method !== 'cash' && f.reference.trim().length < 3) er['pay-ref'] = `Enter the ${REF_LABEL[f.method]}.`
    if (!f.paidOn || f.paidOn > todayISO()) er['pay-date'] = 'Enter the date you paid (not in the future).'
    setErrors(er)
    if (Object.keys(er).length) {
      document.getElementById(Object.keys(er)[0])?.focus()
      return
    }
    setBusy(true)
    try {
      const p = await accounts.reportPayment({ amount, method: f.method, reference: f.reference.trim(), paidOn: f.paidOn, orderId: f.orderId || null, note: f.note.trim() })
      onDone(p)
    } catch (x) {
      setFailure(x.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} noValidate className="card mt-4 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2">
        <h3 className="font-body text-lg font-bold">Record a payment you have made</h3>
        <p className="text-sm text-muted">
          Pay first by MoMo to {site.momo.display} ({site.momo.accountName}) or into {site.bank.bankName} account {site.bank.accountNumber}, then fill this in. We check it and send your receipt here.
        </p>
      </div>
      <Field id="pay-invoice" label="What are you paying?" className="sm:col-span-2">
        <select id="pay-invoice" className="field" value={f.orderId} onChange={chooseInvoice}>
          <option value="">My balance — oldest invoices first ({ghs(outstanding, { decimals: 2 })})</option>
          {openOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {invoiceNo(o)} — {ghs(balanceOf(o), { decimals: 2 })} due {o.due_date ? formatDate(o.due_date) : ''}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="label">How did you pay?</legend>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_PAY_METHODS.map((m) => (
            <label key={m} className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold ${f.method === m ? 'border-primary bg-aqua-soft' : 'border-line bg-white'}`}>
              <input type="radio" name="pay-method" value={m} checked={f.method === m} onChange={set('method')} className="sr-only" />
              {PAY_METHOD[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="pay-amount" label="Amount paid (GH₵)" error={errors['pay-amount']}>
        <input id="pay-amount" inputMode="decimal" className="field" value={f.amount} onChange={set('amount')} {...a11y(errors, 'pay-amount')} />
      </Field>
      <Field id="pay-date" label="Date paid" error={errors['pay-date']}>
        <input id="pay-date" type="date" max={todayISO()} className="field" value={f.paidOn} onChange={set('paidOn')} {...a11y(errors, 'pay-date')} />
      </Field>
      <Field id="pay-ref" label={REF_LABEL[f.method].replace(' (optional)', '')} optional={f.method === 'cash'} error={errors['pay-ref']} className="sm:col-span-2">
        <input id="pay-ref" className="field" value={f.reference} onChange={set('reference')} autoComplete="off" {...a11y(errors, 'pay-ref')} />
      </Field>
      <Field id="pay-note" label="Note for our team" optional className="sm:col-span-2">
        <input id="pay-note" className="field" value={f.note} onChange={set('note')} placeholder="e.g. Paid by our accountant, Kwame" />
      </Field>
      {failure && (
        <div className="sm:col-span-2">
          <Notice>{failure}</Notice>
        </div>
      )}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Sending…' : 'Submit payment'}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── Order received? ───────────────────────────────────────────────────── */

function ReceivedControls({ o, onChanged }) {
  const [mode, setMode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (o.status === 'cancelled' || o.received_status === 'received') return null
  const send = async (status) => {
    setErr('')
    if (status === 'issue' && note.trim().length < 3) return setErr('Tell us briefly what went wrong.')
    setBusy(true)
    try {
      await accounts.confirmReceived(o.id, status, note.trim())
      onChanged()
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3 rounded-xl bg-sand p-3">
      {o.received_status === 'issue' ? (
        <p className="text-sm">
          <strong>Problem reported:</strong> {o.received_note} — our team will contact you.
        </p>
      ) : (
        <p className="text-sm font-semibold">Has this order arrived?</p>
      )}
      {mode === 'issue' ? (
        <div className="mt-2 flex flex-col gap-2">
          <label htmlFor={`issue-${o.id}`} className="text-sm">
            What went wrong?
          </label>
          <textarea id={`issue-${o.id}`} rows={2} className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 bottles of bleach were missing" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="btn btn-primary min-h-10 py-2" onClick={() => send('issue')}>
              Send to Evaclear
            </button>
            <button type="button" className="btn btn-outline min-h-10 py-2" onClick={() => setMode('')}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy} className="btn btn-primary min-h-10 py-2" onClick={() => send('received')}>
            <LuPackageCheck aria-hidden="true" /> Yes, I received it
          </button>
          {o.received_status !== 'issue' && (
            <button type="button" className="btn btn-outline min-h-10 py-2" onClick={() => setMode('issue')}>
              Report a problem
            </button>
          )}
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{err}</p>}
    </div>
  )
}

function SmallPill({ cls, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>
}

function OrderCard({ o, onPay, onChanged }) {
  const bal = balanceOf(o)
  const state = invoiceState(o)
  const late = daysOverdue(o)
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">
            {o.ref} <span className="font-normal text-muted">· {formatDate(o.created_at)}</span>
          </p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            <SmallPill cls="bg-sand text-ink">{ORDER_STATUS[o.status] || o.status}</SmallPill>
            <SmallPill cls="bg-white text-ink ring-1 ring-line">{METHOD[o.payment_method] || o.payment_method}</SmallPill>
            {state !== 'n/a' && state !== 'cancelled' && <SmallPill cls={INVOICE_STATE[state].cls}>{INVOICE_STATE[state].label}</SmallPill>}
            {o.received_status === 'received' && <SmallPill cls="bg-aqua text-ink">Received {formatDate(o.received_at)}</SmallPill>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-xl tabular-nums">{ghs(o.total, { decimals: 2 })}</p>
          {o.payment_method === 'credit' && o.status !== 'cancelled' && (
            <p className={`text-sm ${late ? 'font-bold text-danger' : 'text-muted'}`}>
              {bal > 0 ? `${ghs(bal, { decimals: 2 })} due ${o.due_date ? formatDate(o.due_date) : ''}${late ? ` · ${late} days overdue` : ''}` : 'Paid in full'}
            </p>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">{(o.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/account/invoice?ref=${encodeURIComponent(o.ref)}`} className="btn btn-outline min-h-10 py-2 text-sm">
          <LuFileText aria-hidden="true" /> Invoice
        </Link>
        {bal > 0 && (
          <button type="button" className="btn btn-primary min-h-10 py-2 text-sm" onClick={() => onPay(o.id)}>
            <LuWallet aria-hidden="true" /> Record payment
          </button>
        )}
      </div>
      <ReceivedControls o={o} onChanged={onChanged} />
    </li>
  )
}

function PaymentsList({ payments }) {
  if (!payments.length) return <p className="card p-6 text-muted">No payments recorded yet.</p>
  return (
    <ul className="card divide-y divide-line">
      {payments.map((p) => {
        const s = PAYMENT_STATUS[p.status]
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {ghs(p.amount, { decimals: 2 })} <span className="font-normal text-muted">· {PAY_METHOD[p.method]}</span>
              </p>
              <p className="text-sm text-muted">
                Paid {formatDate(p.paid_on)}
                {p.reference ? ` · ${p.reference}` : ''}
              </p>
              {p.status === 'rejected' && p.admin_note && <p className="text-sm text-danger">{p.admin_note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <SmallPill cls={s.cls}>{s.label}</SmallPill>
              <Link to={`/account/receipt?id=${p.id}`} className="btn btn-outline min-h-10 py-2 text-sm">
                <LuReceipt aria-hidden="true" /> {p.status === 'confirmed' ? p.receipt_no : 'View'}
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function AccountPage() {
  useSeo({ title: 'My Account', noindex: true })
  const auth = useAuth()
  const { navigate } = useRouter()
  const params = useSearchParams()
  const [orders, setOrders] = useState(null)
  const [payments, setPayments] = useState([])
  const [payFor, setPayFor] = useState(null) // null = closed, '' = whole balance, id = invoice
  const [paid, setPaid] = useState(null)

  const loadData = useCallback(() => {
    accounts.myOrders().then(setOrders).catch(() => setOrders([]))
    accounts.myPayments().then(setPayments).catch(() => setPayments([]))
  }, [])
  useEffect(() => {
    if (auth.user) loadData()
  }, [auth.user, loadData])

  // Links like /account?pay=<invoice>#record-payment open the payment form
  const payParam = params.get('pay')
  useEffect(() => {
    if (!orders) return
    const wantsForm = payParam || (typeof window !== 'undefined' && /record-payment/.test(window.location.hash))
    if (wantsForm && orders.some((o) => balanceOf(o) > 0)) {
      setPayFor(payParam || '')
      setTimeout(() => document.getElementById('record-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [orders, payParam])

  const openPay = (id = '') => {
    setPaid(null)
    setPayFor(id)
    setTimeout(() => document.getElementById('record-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const afterChange = () => {
    loadData()
    auth.refresh()
  }

  if (!auth.enabled) return <AccountOffline />
  if (auth.loading) return <Loading />
  if (!auth.user) return <LoginPage />
  const p = auth.profile
  if (!p)
    return (
      <section className="container-x max-w-2xl py-16 text-center">
        <h1 className="text-4xl">We couldn't load your account</h1>
        <p className="mt-4 text-muted">
          {auth.error === 'missing-profile'
            ? 'Your login works, but your account details are missing. Please contact us and we will fix it.'
            : 'Please check your internet connection and try again. If this keeps happening, contact us.'}
        </p>
        {auth.error && auth.error !== 'missing-profile' && <p className="mt-2 text-xs text-muted">Details: {auth.error}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={() => auth.refresh()}>
            Try again
          </button>
          <button type="button" className="btn btn-outline" onClick={() => auth.signOut()}>
            Log out
          </button>
          <a href={waLink('Hello Evaclear! I cannot open my account on the website.')} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
            Contact us
          </a>
        </div>
      </section>
    )
  const s = auth.summary
  const name = p.business_name || p.full_name
  const openOrders = (orders || []).filter((o) => balanceOf(o) > 0).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
  const checking = money(payments.filter((x) => x.status === 'submitted').reduce((t, x) => t + Number(x.amount), 0))

  return (
    <>
      <section className="bg-sand">
        <div className="container-x flex flex-wrap items-end justify-between gap-4 py-10">
          <div>
            <p className="eyebrow mb-2">My account</p>
            <h1 className="text-4xl">{name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-muted">
              <StatusPill status={p.status} /> {p.account_type === 'institution' ? p.business_type || 'Business' : 'Individual'} · {p.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {auth.isAdmin && (
              <Link to="/admin" className="btn btn-primary">
                Staff dashboard
              </Link>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={async () => {
                await auth.signOut()
                navigate('/account/login')
              }}
            >
              <LuLogOut aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      </section>
      <DemoBanner />

      <div className="container-x flex flex-col gap-10 py-10">
        {p.status === 'pending' && (
          <div className="flex gap-3 rounded-2xl bg-[#fff4d6] p-5 text-[#5c3d00]">
            <LuClock className="mt-0.5 shrink-0" size={22} aria-hidden="true" />
            <div>
              <p className="font-bold">Your account is being reviewed</p>
              <p className="text-sm">We usually approve accounts within 1–2 working days. You can still shop and pay by Mobile Money or bank in the meantime.</p>
            </div>
          </div>
        )}
        {(p.status === 'rejected' || p.status === 'suspended') && (
          <div className="flex gap-3 rounded-2xl bg-[#fdecea] p-5 text-[#7a1a12]">
            <LuCircleAlert className="mt-0.5 shrink-0" size={22} aria-hidden="true" />
            <div>
              <p className="font-bold">{p.status === 'rejected' ? 'Credit is not available on this account' : 'Your credit account is on hold'}</p>
              <p className="text-sm">
                Please{' '}
                <a href={waLink(`Hello Evaclear! I'd like to ask about my account (${p.email}).`)} target="_blank" rel="noopener noreferrer" className="underline">
                  contact us on WhatsApp
                </a>{' '}
                to discuss. You can still shop and pay by Mobile Money or bank.
              </p>
            </div>
          </div>
        )}

        {s && (p.status === 'approved' || s.outstanding > 0) && (
          <section aria-labelledby="credit-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id="credit-title" className="text-3xl">
                Credit account
              </h2>
              <div className="flex flex-wrap gap-2">
                <Link to="/account/statement" className="btn btn-outline">
                  <LuFileText aria-hidden="true" /> Statement & outstanding
                </Link>
                {s.outstanding > 0 && (
                  <button type="button" className="btn btn-primary" onClick={() => openPay('')}>
                    <LuWallet aria-hidden="true" /> Record a payment
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="Credit limit" value={ghs(s.credit_limit)} />
              <Tile label="Amount owed" value={ghs(s.outstanding, { decimals: 2 })} />
              <Tile label="Available to spend" value={ghs(s.available, { decimals: 2 })} />
              <Tile label={s.overdue > 0 ? 'Overdue now' : 'Payment terms'} value={s.overdue > 0 ? ghs(s.overdue, { decimals: 2 }) : `${s.payment_terms_days} days`} tone={s.overdue > 0 ? 'warn' : undefined} />
            </div>
            {checking > 0 && (
              <p className="mt-4 rounded-xl bg-[#fff4d6] p-4 text-sm text-[#5c3d00]">
                We're checking <strong>{ghs(checking, { decimals: 2 })}</strong> in payments you recorded. Your balance updates and your receipt appears below once we confirm them.
              </p>
            )}
            {s.overdue > 0 && (
              <p className="mt-4 rounded-xl bg-[#fdecea] p-4 text-sm text-[#7a1a12]">
                You have an overdue balance of <strong>{ghs(s.overdue, { decimals: 2 })}</strong>. Please pay by MoMo ({site.momo.display}) or into our {site.bank.bankName} account ({site.bank.accountNumber}) to keep buying on credit.
              </p>
            )}
            <div id="record-payment" className="scroll-mt-28">
              {paid && (
                <div className="mt-4 rounded-2xl bg-aqua-soft p-5" role="status">
                  <p className="font-bold">Thank you! We've received your payment details ({ghs(paid.amount, { decimals: 2 })}).</p>
                  <p className="mt-1 text-sm">We'll check it against our statement and issue your receipt. If you have a payment slip or screenshot, please send it to us on WhatsApp.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={waLink(`Hello Evaclear! I've recorded a payment of ${ghs(paid.amount, { decimals: 2 })} (${PAY_METHOD[paid.method]}${paid.reference ? `, ref ${paid.reference}` : ''}) for ${p.business_name || p.full_name}. Here is my proof of payment:`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp min-h-10 py-2"
                    >
                      Send proof on WhatsApp
                    </a>
                    <Link to={`/account/receipt?id=${paid.id}`} className="btn btn-outline min-h-10 py-2">
                      View payment notice
                    </Link>
                  </div>
                </div>
              )}
              {payFor !== null && (
                <PaymentForm
                  key={payFor}
                  openOrders={openOrders}
                  preselect={payFor}
                  onCancel={() => setPayFor(null)}
                  onDone={(pmt) => {
                    setPaid(pmt)
                    setPayFor(null)
                    afterChange()
                  }}
                />
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="orders-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="orders-title" className="text-3xl">
              My orders & invoices
            </h2>
            <Link to="/shop" className="btn btn-outline">
              Shop now
            </Link>
          </div>
          {orders === null ? (
            <p className="text-muted">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="card p-6 text-muted">No orders yet. Orders you place while logged in will appear here.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {orders.map((o) => (
                <OrderCard key={o.id + o.status + o.amount_paid + (o.received_status || '')} o={o} onPay={openPay} onChanged={afterChange} />
              ))}
            </ul>
          )}
        </section>

        {(payments.length > 0 || (s && s.outstanding > 0)) && (
          <section aria-labelledby="payments-title">
            <h2 id="payments-title" className="mb-4 text-3xl">
              Payments & receipts
            </h2>
            <PaymentsList payments={payments} />
          </section>
        )}

        <section aria-labelledby="details-title" className="card p-6 sm:p-8">
          <h2 id="details-title" className="mb-1 text-2xl">
            My details
          </h2>
          <p className="mb-5 text-sm text-muted">
            {p.full_name} · {prettyGhPhone(p.phone)} {p.registration_number ? `· Reg/TIN ${p.registration_number}` : ''}
          </p>
          <ProfileEditor profile={p} />
        </section>
      </div>
    </>
  )
}
