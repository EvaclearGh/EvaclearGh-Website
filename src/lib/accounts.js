/*
 * Customer accounts & credit.
 *
 * Production: Supabase (free tier is enough). Add to .env:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...            (the "anon public" key — safe in the browser)
 * and run supabase/schema.sql once in the Supabase SQL editor. See README section 9.
 *
 * Without those keys, accounts are switched off and /account falls back to
 * "track your order on WhatsApp". The preview build uses a demo mode that keeps
 * everything in the visitor's own browser (VITE_ACCOUNTS_MODE=demo).
 *
 * Both backends expose the same functions, so pages don't care which is used.
 */
const env = import.meta.env || {}
const SB_URL = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SB_KEY = env.VITE_SUPABASE_ANON_KEY || ''

export const ACCOUNTS_MODE = SB_URL && SB_KEY ? 'supabase' : env.VITE_ACCOUNTS_MODE === 'demo' ? 'demo' : 'off'
export const accountsEnabled = ACCOUNTS_MODE !== 'off'
export const SUPABASE_PROJECT = (/^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(SB_URL) || [])[1] || ''

const SESSION_KEY = 'evaclear-session-v1'
const store = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null')
    } catch {
      return null
    }
  },
  set(k, v) {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* storage blocked */
    }
  },
}

/* ───────────────────────────── Supabase backend ───────────────────────────── */

function friendly(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'Email or password is incorrect.'
  if (/already registered|already been registered|user already exists/i.test(msg)) return 'An account with this email already exists. Try logging in instead.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the link we sent.'
  if (/password should be at least/i.test(msg)) return 'Your password must be at least 8 characters.'
  if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.'
  if (/failed to fetch|network/i.test(msg)) return 'Could not connect. Check your internet connection and try again.'
  return msg || 'Something went wrong. Please try again.'
}

async function sbFetch(path, { method = 'GET', body, token, headers = {} } = {}) {
  let res
  try {
    res = await fetch(`${SB_URL}${path}`, {
      method,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token || SB_KEY}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(friendly(e.message))
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(friendly(data?.message || data?.msg || data?.error_description || data?.error || `Error ${res.status}`))
  return data
}

function saveSession(s) {
  if (!s?.access_token) return null
  const session = {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
    user: s.user,
  }
  store.set(SESSION_KEY, session)
  return session
}

async function sbSession() {
  // Links from Supabase emails (confirm / reset password) return here with tokens in the URL hash
  if (typeof window !== 'undefined' && /access_token=/.test(window.location.hash)) {
    const p = new URLSearchParams(window.location.hash.slice(1))
    const s = { access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in') || 3600) }
    const user = await sbFetch('/auth/v1/user', { token: s.access_token }).catch(() => null)
    if (user) saveSession({ ...s, user })
    window.__evcRecovery = p.get('type') === 'recovery'
    window.history.replaceState({}, '', window.location.pathname + window.location.search)
  }
  let s = store.get(SESSION_KEY)
  if (!s) return null
  if (s.expires_at - 60 < Date.now() / 1000) {
    try {
      s = saveSession(await sbFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } }))
    } catch {
      store.set(SESSION_KEY, null)
      return null
    }
  }
  return s
}

async function token() {
  const s = await sbSession()
  if (!s) throw new Error('Please log in again.')
  return s
}

const supabaseBackend = {
  getSession: sbSession,
  async signUp(email, password, meta) {
    const data = await sbFetch(`/auth/v1/signup?redirect_to=${encodeURIComponent(`${window.location.origin}/account`)}`, {
      method: 'POST',
      body: { email, password, data: meta },
    })
    if (data?.access_token) {
      saveSession(data)
      return { needsConfirmation: false }
    }
    return { needsConfirmation: true }
  },
  async signIn(email, password) {
    return saveSession(await sbFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }))
  },
  async signOut() {
    const s = store.get(SESSION_KEY)
    store.set(SESSION_KEY, null)
    if (s) await sbFetch('/auth/v1/logout', { method: 'POST', token: s.access_token }).catch(() => {})
  },
  async resetPassword(email) {
    await sbFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(`${window.location.origin}/account/reset`)}`, { method: 'POST', body: { email } })
  },
  async updatePassword(password) {
    const s = await token()
    await sbFetch('/auth/v1/user', { method: 'PUT', token: s.access_token, body: { password } })
  },
  async getProfile() {
    const s = await token()
    const rows = await sbFetch(`/rest/v1/profiles?id=eq.${s.user.id}&select=*`, { token: s.access_token })
    return rows?.[0] || null
  },
  async updateProfile(patch) {
    const s = await token()
    const rows = await sbFetch(`/rest/v1/profiles?id=eq.${s.user.id}`, { method: 'PATCH', token: s.access_token, body: patch, headers: { Prefer: 'return=representation' } })
    return rows?.[0]
  },
  async creditSummary(userId) {
    const s = await token()
    const rows = await sbFetch('/rest/v1/rpc/credit_summary', { method: 'POST', token: s.access_token, body: userId ? { p_user: userId } : {} })
    return rows?.[0] || null
  },
  async placeCreditOrder({ ref, items, subtotal, deliveryFee, delivery }) {
    const s = await token()
    return sbFetch('/rest/v1/rpc/place_credit_order', {
      method: 'POST',
      token: s.access_token,
      body: { p_ref: ref, p_items: items, p_subtotal: subtotal, p_delivery_fee: deliveryFee, p_delivery: delivery },
    })
  },
  // Saves any non-credit order (guest or logged in). The database then sends the WhatsApp alert.
  async submitOrder(o) {
    const s = await sbSession().catch(() => null)
    return sbFetch('/rest/v1/rpc/submit_order', {
      method: 'POST',
      token: s?.access_token,
      body: {
        p_ref: o.ref,
        p_items: o.items,
        p_subtotal: o.subtotal,
        p_delivery_fee: o.deliveryFee,
        p_payment_method: o.paymentMethod,
        p_payment_ref: o.paymentRef || null,
        p_delivery: o.delivery,
        p_customer: o.customer,
      },
    })
  },
  async recordOrder(order) {
    const s = await token()
    await sbFetch('/rest/v1/orders', { method: 'POST', token: s.access_token, body: { ...order, user_id: s.user.id }, headers: { Prefer: 'return=minimal' } })
  },
  async myOrders() {
    const s = await token()
    return sbFetch('/rest/v1/orders?select=*&order=created_at.desc', { token: s.access_token })
  },
  async myPayments() {
    const s = await token()
    return sbFetch('/rest/v1/payments?select=*&order=created_at.desc', { token: s.access_token })
  },
  // Customer: "I have paid" — staff confirm it and a receipt is issued
  async reportPayment({ amount, method, reference, paidOn, orderId, note }) {
    const s = await token()
    return sbFetch('/rest/v1/rpc/report_payment', {
      method: 'POST',
      token: s.access_token,
      body: { p_amount: amount, p_method: method, p_reference: reference || null, p_paid_on: paidOn, p_order_id: orderId || null, p_note: note || null },
    })
  },
  async confirmReceived(orderId, status = 'received', note = '') {
    const s = await token()
    return sbFetch('/rest/v1/rpc/confirm_order_received', { method: 'POST', token: s.access_token, body: { p_order_id: orderId, p_status: status, p_note: note || null } })
  },
  // One order (invoice) — own orders, or any order for staff
  async getOrder(ref) {
    const s = await token()
    const rows = await sbFetch(`/rest/v1/orders?ref=eq.${encodeURIComponent(ref)}&select=*,profiles(*)`, { token: s.access_token })
    return rows?.[0] || null
  },
  async getPayment(id) {
    const s = await token()
    const rows = await sbFetch(`/rest/v1/payments?id=eq.${encodeURIComponent(id)}&select=*,profiles(*)`, { token: s.access_token })
    return rows?.[0] || null
  },
  // Everything needed for a statement of account. userId only for staff.
  async statement(userId) {
    const s = await token()
    const id = userId || s.user.id
    const [profiles, orders, payments, summary] = await Promise.all([
      sbFetch(`/rest/v1/profiles?id=eq.${id}&select=*`, { token: s.access_token }),
      sbFetch(`/rest/v1/orders?user_id=eq.${id}&select=*&order=created_at.asc`, { token: s.access_token }),
      sbFetch(`/rest/v1/payments?user_id=eq.${id}&select=*&order=created_at.asc`, { token: s.access_token }),
      sbFetch('/rest/v1/rpc/credit_summary', { method: 'POST', token: s.access_token, body: { p_user: id } }),
    ])
    return { profile: profiles?.[0] || null, orders: orders || [], payments: payments || [], summary: summary?.[0] || null }
  },
  admin: {
    async profiles() {
      const s = await token()
      return sbFetch('/rest/v1/profiles?select=*&order=created_at.desc', { token: s.access_token })
    },
    async updateProfile(id, patch) {
      const s = await token()
      const rows = await sbFetch(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', token: s.access_token, body: patch, headers: { Prefer: 'return=representation' } })
      return rows?.[0]
    },
    async orders() {
      const s = await token()
      return sbFetch('/rest/v1/orders?select=*,profiles(full_name,business_name,phone,email)&order=created_at.desc', { token: s.access_token })
    },
    async updateOrder(id, patch) {
      const s = await token()
      const rows = await sbFetch(`/rest/v1/orders?id=eq.${id}`, { method: 'PATCH', token: s.access_token, body: patch, headers: { Prefer: 'return=representation' } })
      return rows?.[0]
    },
    async payments() {
      const s = await token()
      return sbFetch('/rest/v1/payments?select=*,profiles(full_name,business_name,phone,email)&order=created_at.desc', { token: s.access_token })
    },
    async confirmPayment(id, amount, note) {
      const s = await token()
      return sbFetch('/rest/v1/rpc/confirm_payment', { method: 'POST', token: s.access_token, body: { p_payment_id: id, p_amount: amount ?? null, p_note: note || null } })
    },
    async rejectPayment(id, note) {
      const s = await token()
      return sbFetch('/rest/v1/rpc/reject_payment', { method: 'POST', token: s.access_token, body: { p_payment_id: id, p_note: note || null } })
    },
    // Website: rebuild & publish on Netlify (build hook kept secret in the database)
    async publishSite(note) {
      const s = await token()
      return sbFetch('/rest/v1/rpc/publish_site', { method: 'POST', token: s.access_token, body: { p_note: note || null } })
    },
    async publishStatus() {
      const s = await token()
      return sbFetch('/rest/v1/rpc/publish_status', { method: 'POST', token: s.access_token, body: {} })
    },
    // Staff: money received (cash at the office, MoMo seen on statement…) → receipt issued at once
    async recordPayment({ userId, amount, method, reference, paidOn, orderId, note }) {
      const s = await token()
      return sbFetch('/rest/v1/rpc/admin_record_payment', {
        method: 'POST',
        token: s.access_token,
        body: { p_user: userId, p_amount: amount, p_method: method, p_reference: reference || null, p_paid_on: paidOn || today(), p_order_id: orderId || null, p_note: note || null },
      })
    },
  },
}

/* ──────────────────── Demo backend (preview only, this browser) ─────────────────── */

const DB_KEY = 'evaclear-demo-db-v1'
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

function db() {
  let d = store.get(DB_KEY)
  if (!d) {
    const adminId = 'demo-admin'
    d = {
      users: [{ id: adminId, email: 'admin@demo.com', password: 'demo1234' }],
      profiles: [
        { id: adminId, email: 'admin@demo.com', account_type: 'individual', full_name: 'Evaclear Admin (demo)', phone: '+233256116151', status: 'approved', credit_limit: 0, payment_terms_days: 30, role: 'admin', created_at: new Date().toISOString(), requested_credit: 0 },
      ],
      orders: [],
      payments: [],
    }
    store.set(DB_KEY, d)
  }
  return d
}
const save = (d) => store.set(DB_KEY, d)
const wait = (v) => new Promise((r) => setTimeout(() => r(v), 150))

const roundMoney = (n) => Math.round(Number(n) * 100) / 100
const owedOn = (o) => (o.payment_method === 'credit' && o.status !== 'cancelled' ? Math.max(roundMoney(o.total - o.amount_paid), 0) : 0)

// Same rules as private.apply_payment() in supabase/credit-documents.sql
function applyPayment(d, pay) {
  let left = pay.amount
  const alloc = []
  const take = (o) => {
    const a = Math.min(owedOn(o), left)
    if (a > 0) {
      o.amount_paid = roundMoney(o.amount_paid + a)
      alloc.push({ order_id: o.id, ref: o.ref, amount: a })
      left = roundMoney(left - a)
    }
  }
  const mine = d.orders.filter((o) => o.user_id === pay.user_id)
  const chosen = pay.order_id && mine.find((o) => o.id === pay.order_id)
  if (chosen) take(chosen)
  mine
    .filter((o) => owedOn(o) > 0)
    .sort((a, b) => (a.due_date || a.created_at).localeCompare(b.due_date || b.created_at) || a.created_at.localeCompare(b.created_at))
    .forEach((o) => left > 0 && take(o))
  d.receiptSeq = (d.receiptSeq || 0) + 1
  Object.assign(pay, {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    allocations: alloc,
    unallocated: Math.max(left, 0),
    receipt_no: pay.receipt_no || `RCT-${new Date().getFullYear()}-${String(d.receiptSeq).padStart(5, '0')}`,
  })
  return pay
}

function summaryFor(d, id) {
  const p = d.profiles.find((x) => x.id === id)
  if (!p) return null
  const credit = d.orders.filter((o) => o.user_id === id && o.payment_method === 'credit' && o.status !== 'cancelled' && o.total > o.amount_paid)
  const outstanding = credit.reduce((s, o) => s + (o.total - o.amount_paid), 0)
  const overdue = credit.filter((o) => o.due_date < today()).reduce((s, o) => s + (o.total - o.amount_paid), 0)
  return { credit_limit: p.credit_limit, outstanding, available: Math.max(p.credit_limit - outstanding, 0), overdue, payment_terms_days: p.payment_terms_days, status: p.status }
}

function demoUser() {
  const s = store.get(SESSION_KEY)
  return s?.user || null
}

const demoBackend = {
  async getSession() {
    return wait(store.get(SESSION_KEY))
  },
  async signUp(email, password, meta) {
    const d = db()
    if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists. Try logging in instead.')
    const id = uid()
    d.users.push({ id, email, password })
    d.profiles.push({
      id,
      email,
      created_at: new Date().toISOString(),
      account_type: meta.account_type === 'institution' ? 'institution' : 'individual',
      full_name: meta.full_name || '',
      phone: meta.phone || '',
      business_name: meta.business_name || null,
      business_type: meta.business_type || null,
      registration_number: meta.registration_number || null,
      contact_role: meta.contact_role || null,
      address: meta.address || null,
      city: meta.city || null,
      gps: meta.gps || null,
      requested_credit: Number(meta.requested_credit) || 0,
      status: 'pending',
      credit_limit: 0,
      payment_terms_days: 30,
      role: 'customer',
    })
    save(d)
    store.set(SESSION_KEY, { access_token: 'demo', user: { id, email } })
    return wait({ needsConfirmation: false })
  },
  async signIn(email, password) {
    const u = db().users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password)
    if (!u) throw new Error('Email or password is incorrect.')
    const s = { access_token: 'demo', user: { id: u.id, email: u.email } }
    store.set(SESSION_KEY, s)
    return wait(s)
  },
  async signOut() {
    store.set(SESSION_KEY, null)
  },
  async resetPassword() {
    return wait()
  },
  async updatePassword(password) {
    const d = db()
    const u = d.users.find((x) => x.id === demoUser()?.id)
    if (u) u.password = password
    save(d)
  },
  async getProfile() {
    const u = demoUser()
    return wait(u ? db().profiles.find((p) => p.id === u.id) || null : null)
  },
  async updateProfile(patch) {
    const d = db()
    const p = d.profiles.find((x) => x.id === demoUser()?.id)
    const { status, credit_limit, payment_terms_days, role, admin_notes, email, ...safe } = patch // customers can't change these
    Object.assign(p, safe)
    save(d)
    return wait(p)
  },
  async creditSummary(userId) {
    return wait(summaryFor(db(), userId || demoUser()?.id))
  },
  async placeCreditOrder({ ref, items, subtotal, deliveryFee, delivery }) {
    const d = db()
    const u = demoUser()
    const p = d.profiles.find((x) => x.id === u?.id)
    if (!p) throw new Error('Please log in to buy on credit.')
    if (p.status !== 'approved') throw new Error('Your account is not approved for credit yet.')
    const s = summaryFor(d, p.id)
    const total = Math.round((subtotal + deliveryFee) * 100) / 100
    if (s.overdue > 0) throw new Error('You have an overdue balance. Please settle it before placing a new credit order.')
    if (total > s.available) throw new Error(`This order (GHS ${total.toFixed(2)}) is more than your available credit (GHS ${s.available.toFixed(2)}).`)
    const o = { id: uid(), ref, user_id: p.id, created_at: new Date().toISOString(), items, subtotal, delivery_fee: deliveryFee, total, payment_method: 'credit', delivery, status: 'pending', amount_paid: 0, due_date: addDays(p.payment_terms_days) }
    d.orders.unshift(o)
    save(d)
    return wait(o)
  },
  async submitOrder(o) {
    const d = db()
    const u = demoUser()
    d.orders.unshift({ id: uid(), ref: o.ref, user_id: u?.id || null, created_at: new Date().toISOString(), items: o.items, subtotal: o.subtotal, delivery_fee: o.deliveryFee, total: Math.round((o.subtotal + o.deliveryFee) * 100) / 100, payment_method: o.paymentMethod, payment_ref: o.paymentRef || null, delivery: o.delivery, customer: o.customer, status: 'pending', amount_paid: 0 })
    save(d)
    return wait(o.ref)
  },
  async recordOrder(order) {
    const d = db()
    const u = demoUser()
    if (!u) return
    d.orders.unshift({ id: uid(), created_at: new Date().toISOString(), status: 'pending', amount_paid: 0, ...order, user_id: u.id })
    save(d)
  },
  async myOrders() {
    const u = demoUser()
    return wait(db().orders.filter((o) => o.user_id === u?.id))
  },
  async myPayments() {
    const u = demoUser()
    return wait((db().payments || []).filter((p) => p.user_id === u?.id).sort((a, b) => b.created_at.localeCompare(a.created_at)))
  },
  async reportPayment({ amount, method, reference, paidOn, orderId, note }) {
    const d = db()
    const u = demoUser()
    if (!u) throw new Error('Please log in to record a payment.')
    if (!['momo', 'bank_transfer', 'bank_deposit', 'cheque', 'cash'].includes(method)) throw new Error('Choose how you paid.')
    if (!(amount > 0)) throw new Error('Enter the amount you paid.')
    if (method !== 'cash' && String(reference || '').trim().length < 3) throw new Error('Enter the transaction ID, bank reference or cheque number.')
    if (!paidOn || paidOn > today()) throw new Error('Enter the date you paid (not in the future).')
    const owed = roundMoney(d.orders.filter((o) => o.user_id === u.id).reduce((t, o) => t + owedOn(o), 0))
    if (owed <= 0) throw new Error('There is no balance to pay on your account.')
    if (amount > owed + 0.009) throw new Error(`The amount (GHS ${amount}) is more than you owe (GHS ${owed.toFixed(2)}).`)
    const p = { id: uid(), created_at: new Date().toISOString(), user_id: u.id, order_id: orderId || null, amount: roundMoney(amount), method, reference: String(reference || '').trim() || null, paid_on: paidOn, note: note?.trim() || null, status: 'submitted', recorded_by: 'customer', receipt_no: null, allocations: [], unallocated: 0 }
    d.payments = [p, ...(d.payments || [])]
    save(d)
    return wait(p)
  },
  async confirmReceived(orderId, status = 'received', note = '') {
    const d = db()
    const o = d.orders.find((x) => x.id === orderId && x.user_id === demoUser()?.id)
    if (!o) throw new Error('Order not found on your account.')
    if (o.status === 'cancelled') throw new Error('This order was cancelled.')
    if (o.received_status === 'received') throw new Error('You have already confirmed this order as received.')
    if (status === 'issue' && String(note).trim().length < 3) throw new Error('Tell us briefly what went wrong.')
    Object.assign(o, { received_status: status, received_at: new Date().toISOString(), received_note: String(note).trim() || null })
    if (status === 'received') o.status = 'delivered'
    save(d)
    return wait(o)
  },
  async getOrder(ref) {
    const d = db()
    const u = demoUser()
    const me = d.profiles.find((p) => p.id === u?.id)
    const o = d.orders.find((x) => x.ref === ref && (x.user_id === u?.id || me?.role === 'admin'))
    return wait(o ? { ...o, profiles: d.profiles.find((p) => p.id === o.user_id) || null } : null)
  },
  async getPayment(id) {
    const d = db()
    const u = demoUser()
    const me = d.profiles.find((p) => p.id === u?.id)
    const p = (d.payments || []).find((x) => x.id === id && (x.user_id === u?.id || me?.role === 'admin'))
    return wait(p ? { ...p, profiles: d.profiles.find((x) => x.id === p.user_id) || null } : null)
  },
  async statement(userId) {
    const d = db()
    const u = demoUser()
    const me = d.profiles.find((p) => p.id === u?.id)
    const id = userId && me?.role === 'admin' ? userId : u?.id
    const asc = (a, b) => a.created_at.localeCompare(b.created_at)
    return wait({
      profile: d.profiles.find((p) => p.id === id) || null,
      orders: d.orders.filter((o) => o.user_id === id).sort(asc),
      payments: (d.payments || []).filter((p) => p.user_id === id).sort(asc),
      summary: summaryFor(d, id),
    })
  },
  admin: {
    async profiles() {
      return wait([...db().profiles].sort((a, b) => b.created_at.localeCompare(a.created_at)))
    },
    async updateProfile(id, patch) {
      const d = db()
      const p = d.profiles.find((x) => x.id === id)
      if (patch.status === 'approved' && p.status !== 'approved') patch.approved_at = new Date().toISOString()
      Object.assign(p, patch)
      save(d)
      return wait(p)
    },
    async orders() {
      const d = db()
      return wait(d.orders.map((o) => ({ ...o, profiles: d.profiles.find((p) => p.id === o.user_id) || null })))
    },
    async updateOrder(id, patch) {
      const d = db()
      const o = d.orders.find((x) => x.id === id)
      Object.assign(o, patch)
      save(d)
      return wait(o)
    },
    async payments() {
      const d = db()
      return wait([...(d.payments || [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => ({ ...p, profiles: d.profiles.find((x) => x.id === p.user_id) || null })))
    },
    async confirmPayment(id, amount, note) {
      const d = db()
      const p = (d.payments || []).find((x) => x.id === id)
      if (!p) throw new Error('Payment not found.')
      if (p.status !== 'submitted') throw new Error(`This payment has already been ${p.status}.`)
      if (amount != null) {
        if (!(amount > 0)) throw new Error('Enter the amount that actually arrived.')
        p.amount = roundMoney(amount)
      }
      if (note) p.admin_note = note
      applyPayment(d, p)
      save(d)
      return wait(p)
    },
    async rejectPayment(id, note) {
      const d = db()
      const p = (d.payments || []).find((x) => x.id === id && x.status === 'submitted')
      if (!p) throw new Error('Only payments that are still being checked can be rejected.')
      Object.assign(p, { status: 'rejected', confirmed_at: new Date().toISOString(), admin_note: note || 'We could not find this payment. Please contact us.' })
      save(d)
      return wait(p)
    },
    async publishSite(note) {
      const d = db()
      d.publishes = [{ at: new Date().toISOString(), email: 'admin@demo.com', note: note || null }, ...(d.publishes || [])].slice(0, 8)
      save(d)
      return wait({ ok: true, demo: true })
    },
    async publishStatus() {
      return wait({ configured: true, demo: true, recent: db().publishes || [] })
    },
    async recordPayment({ userId, amount, method, reference, paidOn, orderId, note }) {
      const d = db()
      if (!(amount > 0)) throw new Error('Enter the amount received.')
      const p = { id: uid(), created_at: new Date().toISOString(), user_id: userId, order_id: orderId || null, amount: roundMoney(amount), method: method || 'cash', reference: reference || null, paid_on: paidOn || today(), note: null, admin_note: note || null, status: 'submitted', recorded_by: 'staff', allocations: [], unallocated: 0 }
      d.payments = [p, ...(d.payments || [])]
      applyPayment(d, p)
      save(d)
      return wait(p)
    },
  },
}

const offBackend = new Proxy(
  {},
  {
    get: () => async () => {
      throw new Error('Customer accounts are not switched on yet.')
    },
  },
)

export const accounts = ACCOUNTS_MODE === 'supabase' ? supabaseBackend : ACCOUNTS_MODE === 'demo' ? demoBackend : offBackend
