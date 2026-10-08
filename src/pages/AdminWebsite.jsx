// Staff dashboard → Website tab: edit the site visually, publish it, and keep it healthy.
import { useEffect, useState } from 'react'
import {
  LuCloudUpload,
  LuDatabase,
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuGithub,
  LuGlobe,
  LuImage,
  LuLayoutDashboard,
  LuMegaphone,
  LuPackage,
  LuPackagePlus,
  LuPencil,
  LuPhone,
  LuSearch,
  LuShieldCheck,
  LuTruck,
  LuCircleHelp,
  LuUsers,
  LuWallet,
} from 'react-icons/lu'
import admin from '../data/admin.json'
import site from '../data/site.json'
import { accounts, ACCOUNTS_MODE, SUPABASE_PROJECT } from '../lib/accounts.js'
import { formatDate } from '../lib/format.js'

const CMS = '/cms/'
const cms = (hash = '') => `${CMS}${hash ? `#/${hash}` : ''}`

const SHORTCUTS = [
  { Icon: LuPackage, label: 'Products & prices', hash: 'collections/products' },
  { Icon: LuPackagePlus, label: 'Add a product', hash: 'collections/products/new' },
  { Icon: LuPhone, label: 'Contact, MoMo & bank details', hash: 'collections/settings/entries/site' },
  { Icon: LuMegaphone, label: 'Top banner & taglines', hash: 'collections/settings/entries/site' },
  { Icon: LuTruck, label: 'Delivery zones & fees', hash: 'collections/settings/entries/delivery' },
  { Icon: LuFileText, label: 'Cleaning tips (blog)', hash: 'collections/articles' },
  { Icon: LuCircleHelp, label: 'Help centre questions', hash: 'collections/settings/entries/faqs' },
  { Icon: LuImage, label: 'Photos', hash: 'assets' },
]

function toCsv(rows) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

function download(name, rows) {
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}

function Card({ title, Icon, children, className = '' }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="flex items-center gap-2 font-body text-xl font-bold">
        {Icon && <Icon className="text-primary" aria-hidden="true" />} {title}
      </h2>
      {children}
    </section>
  )
}

function ToolLink({ href, Icon, label, note }) {
  if (!href) return null
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-full items-start gap-3 rounded-xl border border-line bg-white p-4 hover:border-primary">
        <Icon className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
        <span>
          <span className="flex items-center gap-1 font-semibold">
            {label} <LuExternalLink size={14} aria-hidden="true" />
          </span>
          {note && <span className="block text-sm text-muted">{note}</span>}
        </span>
      </a>
    </li>
  )
}

function Publish() {
  const [status, setStatus] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const load = () =>
    accounts.admin
      .publishStatus()
      .then(setStatus)
      .catch((e) => setStatus({ error: e.message }))
  useEffect(() => {
    load()
  }, [])
  const publish = async () => {
    setBusy(true)
    setMsg({ tone: '', text: '' })
    try {
      await accounts.admin.publishSite(note.trim())
      setNote('')
      setMsg({ tone: 'ok', text: 'Publishing has started. Your changes will be live in about 2 minutes. Refresh the website to check.' })
      load()
    } catch (e) {
      setMsg({ tone: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const notSetUp = status?.error?.match(/publish_status|function|not found|schema cache/i) || status?.configured === false
  const deploysUrl = admin.netlifySiteName ? `https://app.netlify.com/sites/${admin.netlifySiteName}/deploys` : null

  return (
    <Card title="Publish your changes" Icon={LuCloudUpload}>
      <p className="mt-2 text-sm text-muted">
        Changes saved in the website editor are kept safely but are not live yet. When you've finished a batch of edits, press <strong>Publish website now</strong>. One publish uses one of your monthly Netlify deploys, so publish once after several edits rather than after each one.
      </p>
      {admin.netlifySiteId && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          Live site status:
          <img src={`https://api.netlify.com/api/v1/badges/${admin.netlifySiteId}/deploy-status`} alt="Latest publish status" height="20" />
        </p>
      )}
      {notSetUp ? (
        <p className="mt-4 rounded-xl bg-[#fff4d6] p-4 text-sm text-[#5c3d00]">
          The publish button isn't connected yet. Run <code>supabase/website-admin.sql</code> in Supabase and save your Netlify build hook (README section 16). Until then, use <strong>Trigger deploy</strong> in Netlify{deploysUrl ? ' (link below)' : ''}.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="publish-note" className="label">
              What changed? <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="publish-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New prices for bleach and floor cleaner" maxLength={80} />
          </div>
          <button type="button" className="btn btn-primary" disabled={busy || !status} onClick={publish}>
            <LuCloudUpload aria-hidden="true" /> {busy ? 'Starting…' : 'Publish website now'}
          </button>
        </div>
      )}
      {msg.text && (
        <p role={msg.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-xl p-3 text-sm font-semibold ${msg.tone === 'error' ? 'bg-[#fdecea] text-[#7a1a12]' : 'bg-aqua-soft'}`}>
          {msg.text}
        </p>
      )}
      {status?.demo && <p className="mt-3 text-xs text-muted">Demo mode: nothing is really published.</p>}
      {status?.recent?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold">Recent publishes</h3>
          <ul className="mt-1 divide-y divide-line text-sm">
            {status.recent.map((r, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {formatDate(r.at)}, {new Date(r.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {r.email}
                </span>
                {r.note && <span className="text-muted">{r.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {deploysUrl && (
        <a href={deploysUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">
          Publish history & undo a publish (Netlify) <LuExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </Card>
  )
}

export default function WebsiteTab({ profiles = [], orders = [], payments = [] }) {
  const netlify = admin.netlifySiteName ? `https://app.netlify.com/sites/${admin.netlifySiteName}` : null
  const sb = SUPABASE_PROJECT ? `https://supabase.com/dashboard/project/${SUPABASE_PROJECT}` : null
  const gh = admin.githubRepo ? `https://github.com/${admin.githubRepo}` : null
  const stamp = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Edit the website" Icon={LuPencil} className="lg:col-span-2">
        <p className="mt-2 text-sm text-muted">
          Change products, prices, photos, contact details, delivery fees, the top banner, help questions and blog posts with simple forms, no code needed. Sign in with the GitHub account that has access to the website.
        </p>
        <a href={CMS} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4">
          <LuPencil aria-hidden="true" /> Open website editor
        </a>
        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHORTCUTS.map(({ Icon, label, hash }) => (
            <li key={label}>
              <a href={cms(hash)} target="_blank" rel="noopener noreferrer" className="flex h-full items-center gap-2 rounded-xl bg-sand p-3 text-sm font-semibold hover:bg-aqua-soft">
                <Icon className="shrink-0 text-primary" aria-hidden="true" /> {label}
              </a>
            </li>
          ))}
        </ul>
        {ACCOUNTS_MODE === 'demo' && <p className="mt-3 text-xs text-muted">The editor works on the live website once it is hosted from GitHub (README section 16). It isn't available in this preview.</p>}
      </Card>

      <Publish />

      <Card title="Download your data" Icon={LuDownload}>
        <p className="mt-2 text-sm text-muted">Spreadsheet files (CSV) that open in Excel or Google Sheets. Keep a copy each month.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline min-h-11 py-2"
            disabled={!profiles.length}
            onClick={() =>
              download(
                `evaclear-customers-${stamp}.csv`,
                profiles.map((p) => ({
                  created: p.created_at?.slice(0, 10),
                  type: p.account_type,
                  business: p.business_name,
                  business_type: p.business_type,
                  name: p.full_name,
                  phone: p.phone,
                  email: p.email,
                  address: [p.address, p.city, p.gps].filter(Boolean).join(', '),
                  reg_tin: p.registration_number,
                  status: p.status,
                  credit_limit: p.credit_limit,
                  terms_days: p.payment_terms_days,
                })),
              )
            }
          >
            <LuUsers aria-hidden="true" /> Customers
          </button>
          <button
            type="button"
            className="btn btn-outline min-h-11 py-2"
            disabled={!orders.length}
            onClick={() =>
              download(
                `evaclear-orders-${stamp}.csv`,
                orders.map((o) => ({
                  date: o.created_at?.slice(0, 10),
                  ref: o.ref,
                  customer: o.profiles?.business_name || o.profiles?.full_name || o.customer?.name || '',
                  phone: o.profiles?.phone || o.customer?.phone || '',
                  items: (o.items || []).map((i) => `${i.qty}x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`).join('; '),
                  subtotal: o.subtotal,
                  delivery_fee: o.delivery_fee,
                  total: o.total,
                  payment: o.payment_method,
                  payment_ref: o.payment_ref,
                  paid: o.amount_paid,
                  due: o.due_date,
                  status: o.status,
                  received: o.received_status || '',
                  delivery: o.delivery?.method === 'pickup' ? 'Pickup' : [o.delivery?.zone, o.delivery?.address].filter(Boolean).join(' - '),
                })),
              )
            }
          >
            <LuPackage aria-hidden="true" /> Orders
          </button>
          <button
            type="button"
            className="btn btn-outline min-h-11 py-2"
            disabled={!payments.length}
            onClick={() =>
              download(
                `evaclear-payments-${stamp}.csv`,
                payments.map((p) => ({
                  recorded: p.created_at?.slice(0, 10),
                  paid_on: p.paid_on,
                  receipt: p.receipt_no,
                  customer: p.profiles?.business_name || p.profiles?.full_name || '',
                  amount: p.amount,
                  method: p.method,
                  reference: p.reference,
                  status: p.status,
                  applied_to: (p.allocations || []).map((a) => `INV-${a.ref}: ${a.amount}`).join('; '),
                })),
              )
            }
          >
            <LuWallet aria-hidden="true" /> Payments
          </button>
        </div>
      </Card>

      <Card title="Maintenance tools" Icon={LuLayoutDashboard} className="lg:col-span-2">
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ToolLink href={netlify} Icon={LuGlobe} label="Hosting (Netlify)" note="Publish history, undo a publish, site speed" />
          <ToolLink href={netlify && `${netlify}/domain-management`} Icon={LuShieldCheck} label="Domain & HTTPS" note={site.siteUrl.replace(/^https?:\/\//, '')} />
          <ToolLink href={gh && `${gh}/commits/main`} Icon={LuGithub} label="Change history (GitHub)" note="Every edit, who made it and when, and how to undo it" />
          <ToolLink href={sb} Icon={LuDatabase} label="Database (Supabase)" note="Accounts, orders, payments, backups" />
          <ToolLink href={sb && `${sb}/auth/users`} Icon={LuUsers} label="Customer logins" note="Reset or remove a login" />
          <ToolLink href="https://dashboard.paystack.com/" Icon={LuWallet} label="Card payments (Paystack)" note="Check and refund card payments" />
          <ToolLink href="https://search.google.com/search-console" Icon={LuSearch} label="Google Search Console" note="How people find you on Google" />
          <ToolLink href={`${site.siteUrl}/sitemap.xml`} Icon={LuFileText} label="Sitemap" note="Submit this to Google once" />
        </ul>
        {(!netlify || !gh) && (
          <p className="mt-3 text-sm text-muted">
            Some links appear once you add your GitHub and Netlify names under <a href={cms('collections/settings/entries/admin')} className="font-semibold text-primary underline" target="_blank" rel="noopener noreferrer">Staff dashboard links</a> in the editor.
          </p>
        )}
        <details className="mt-5 rounded-xl bg-sand p-4">
          <summary className="cursor-pointer font-semibold">Monthly website check (10 minutes)</summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Open the website on a phone: home page, a product, add to cart and checkout (don't place the order).</li>
            <li>Check prices and stock-outs in the editor; untick "Show on website" for products you can't supply.</li>
            <li>Approve or reject waiting customer accounts, confirm payments and chase overdue credit (Accounts and Payments tabs).</li>
            <li>Download customers, orders and payments above and save them with your records.</li>
            <li>Log in to Supabase once a month so the free project doesn't pause, and check the WhatsApp alerts still arrive.</li>
            <li>Look at Netlify for failed publishes and your monthly deploy allowance.</li>
            <li>Renew the domain before it expires (check the date where you bought it).</li>
          </ol>
        </details>
      </Card>
    </div>
  )
}
