// Stockists, Contact, Help Centre and Wholesale pages
import { useMemo, useState } from 'react'
import { LuClock, LuMail, LuMapPin, LuMessageCircle, LuPhone, LuStore } from 'react-icons/lu'
import site from '../data/site.json'
import stockistData from '../data/stockists.json'
import faqData from '../data/faqs.json'
import { inCollection, products } from '../lib/catalog.js'
import ProductCard from '../components/ProductCard.jsx'
import { isValidGhPhone, normaliseGhPhone } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { waLink } from '../lib/whatsapp.js'
import { Accordion, PageHero, SampleTag } from '../components/ui.jsx'

function MapEmbed({ query, title, className = '' }) {
  return (
    <iframe
      title={title}
      src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`w-full rounded-card border-0 bg-sand ${className}`}
    />
  )
}

/* ── Stockists ─────────────────────────────────────────────────────────── */
export function Stockists() {
  useSeo({ title: 'Where to Buy', description: 'Find shops, supermarkets and market stalls selling Evafresh cleaning products across Ghana.' })
  const regions = useMemo(() => ['All regions', ...new Set(stockistData.stockists.map((s) => s.region))], [])
  const [region, setRegion] = useState('All regions')
  const [selected, setSelected] = useState(null)
  const list = stockistData.stockists.filter((s) => region === 'All regions' || s.region === region)
  const mapQuery = selected ? `${selected.mapQuery}, Ghana` : region === 'All regions' ? 'Ghana' : `${region} Region, Ghana`
  return (
    <>
      <PageHero eyebrow="Where to buy" title="Find Evafresh near you" intro="Shop online with delivery, or pick up from one of our stockists across Ghana.">
        <div className="mt-4">
          <SampleTag>Sample stockists — edit src/data/stockists.json</SampleTag>
        </div>
      </PageHero>
      <section className="container-x py-12">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label htmlFor="region" className="font-bold">
            Region
          </label>
          <select id="region" value={region} onChange={(e) => { setRegion(e.target.value); setSelected(null) }} className="field w-auto">
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <span className="text-muted" aria-live="polite">
            {list.length} location{list.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <ul className="flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1">
            {list.map((s) => (
              <li key={s.name}>
                <button type="button" onClick={() => setSelected(s)} aria-pressed={selected?.name === s.name} className={`card w-full p-5 text-left transition ${selected?.name === s.name ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}>
                  <span className="flex items-start gap-3">
                    <LuStore className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <span className="block font-bold">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {s.address}, {s.city} · {s.region}
                      </span>
                      <span className="mt-1 block text-sm">
                        {s.type} · {s.phone}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <MapEmbed query={mapQuery} title={`Map of ${selected ? selected.name : region}`} className="h-[420px] lg:h-[640px]" />
        </div>
        <div className="card mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl">Want to stock Evafresh?</h2>
            <p className="text-muted">Supermarkets, shops and market traders: ask about wholesale prices.</p>
          </div>
          <Link to="/wholesale" className="btn btn-primary">
            Become a stockist
          </Link>
        </div>
      </section>
    </>
  )
}

/* ── shared form helper ────────────────────────────────────────────────── */
async function sendForm(endpoint, data, waText) {
  if (endpoint) {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error('send failed')
    return 'sent'
  }
  window.open(waLink(waText), '_blank', 'noopener')
  return 'whatsapp'
}

function FormField({ id, label, error, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Contact ───────────────────────────────────────────────────────────── */
export function Contact() {
  useSeo({ title: 'Contact Us', description: `Contact ${site.legalName} in ${site.address.city} by phone, WhatsApp or email.` })
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '' })
  const [err, setErr] = useState({})
  const [status, setStatus] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    const x = {}
    if (f.name.trim().length < 2) x.name = 'Please enter your name.'
    if (!isValidGhPhone(f.phone)) x.phone = 'Enter a valid Ghana number, e.g. 024 123 4567.'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Please enter a valid email.'
    if (f.message.trim().length < 5) x.message = 'Please write a short message.'
    setErr(x)
    if (Object.keys(x).length) return document.getElementById(Object.keys(x)[0])?.focus()
    try {
      const r = await sendForm(site.forms.contactEndpoint, { ...f, phone: normaliseGhPhone(f.phone) }, `Hello Evaclear! My name is ${f.name} (${normaliseGhPhone(f.phone)}).\n\n${f.message}`)
      setStatus(r)
    } catch {
      setStatus('error')
    }
  }
  const a = (k) => ({ 'aria-invalid': !!err[k], 'aria-describedby': err[k] ? `${k}-err` : undefined })
  const cards = [
    { Icon: LuMessageCircle, title: 'WhatsApp', text: [site.whatsapp.display, 'Fastest reply'], href: waLink(), label: 'Chat now' },
    { Icon: LuPhone, title: 'Call us', phones: site.phones },
    { Icon: LuMail, title: 'Email', text: site.email, href: `mailto:${site.email}`, label: 'Send email' },
  ]
  return (
    <>
      <PageHero eyebrow="Contact" title="We're here to help" intro="Questions about products, orders or delivery? Get in touch, and we usually reply within the hour during opening hours." />
      <section className="container-x py-12">
        <ul className="grid gap-4 sm:grid-cols-3">
          {cards.map(({ Icon, title, text, href, label, phones }) => (
            <li key={title}>
              {phones ? (
                <div className="card flex h-full items-start gap-4 p-6">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-aqua-soft text-primary">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    {phones.map((n) => (
                      <a key={n} href={`tel:${n.replace(/\s/g, '')}`} className="block whitespace-nowrap py-0.5 text-muted hover:text-primary">
                        {n}
                      </a>
                    ))}
                  </span>
                </div>
              ) : (
                <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="card flex h-full items-start gap-4 p-6 transition hover:shadow-lg">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-aqua-soft text-primary">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    {[].concat(text).map((line) => (
                      <span key={line} className={`block text-muted ${line.includes('@') ? 'break-all' : 'whitespace-nowrap'}`}>
                        {line}
                      </span>
                    ))}
                    <span className="mt-1 block text-sm font-bold text-primary">{label} →</span>
                  </span>
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl">Send us a message</h2>
            {status === 'sent' || status === 'whatsapp' ? (
              <p role="status" className="mt-4 rounded-xl bg-aqua-soft p-4 font-semibold">
                {status === 'sent' ? 'Thank you! Your message has been sent. We’ll reply soon.' : 'WhatsApp has opened with your message — tap Send to reach us.'}
              </p>
            ) : (
              <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
                <FormField id="name" label="Name" error={err.name}>
                  <input id="name" className="field" autoComplete="name" value={f.name} onChange={set('name')} {...a('name')} />
                </FormField>
                <FormField id="phone" label="Phone (+233)" error={err.phone}>
                  <input id="phone" type="tel" className="field" autoComplete="tel" placeholder="024 123 4567" value={f.phone} onChange={set('phone')} {...a('phone')} />
                </FormField>
                <FormField id="email" label="Email" optional error={err.email}>
                  <input id="email" type="email" className="field" autoComplete="email" value={f.email} onChange={set('email')} {...a('email')} />
                </FormField>
                <FormField id="message" label="Message" error={err.message}>
                  <textarea id="message" rows={5} className="field" value={f.message} onChange={set('message')} {...a('message')} />
                </FormField>
                {status === 'error' && <p role="alert" className="font-semibold text-danger">Sorry, that didn’t send. Please WhatsApp or call us.</p>}
                <button type="submit" className="btn btn-primary self-start">
                  Send message
                </button>
              </form>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="card p-6">
              <h2 className="text-2xl">Visit us</h2>
              <p className="mt-3 flex gap-2">
                <LuMapPin className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                <address className="not-italic">
                  {site.address.street}, {site.address.area}
                  <br />
                  {site.address.city}, {site.address.region} Region
                  <br />
                  Digital address: {site.address.gps}
                </address>
              </p>
              <p className="mt-2 flex gap-2">
                <LuClock className="mt-1 shrink-0 text-primary" aria-hidden="true" /> {site.openingHours}
              </p>
            </div>
            <MapEmbed query={site.mapEmbedQuery} title="Map showing the Evaclear store location" className="h-80 lg:flex-1" />
          </div>
        </div>
      </section>
    </>
  )
}

/* ── Help Centre / FAQs ────────────────────────────────────────────────── */
export function Help() {
  const all = faqData.groups.flatMap((g) => g.items)
  useSeo({
    title: 'Help Centre & FAQs',
    description: 'Answers about delivery, payment, refunds, using our products and safety.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: all.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })) },
  })
  return (
    <>
      <PageHero eyebrow="Help centre" title="Frequently asked questions" intro="Can't find your answer? Chat with us on WhatsApp." />
      <section className="container-x grid gap-10 py-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="FAQ topics" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
            {faqData.groups.map((g) => (
              <li key={g.id}>
                <a href={`#${g.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth' }) }} className="block whitespace-nowrap rounded-full bg-white px-4 py-2 font-semibold hover:bg-aqua-soft lg:rounded-xl">
                  {g.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-12">
          {faqData.groups.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-28">
              <h2 id={`${g.id}-h`} className="mb-4 text-3xl">
                {g.title}
              </h2>
              <Accordion items={g.items.map((i) => ({ title: i.q, content: <p>{i.a}</p> }))} />
            </section>
          ))}
          <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-heading text-xl">Still need help?</p>
            <div className="flex flex-wrap gap-3">
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                WhatsApp us
              </a>
              <Link to="/contact" className="btn btn-outline">
                Contact page
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ── Wholesale / Bulk orders ───────────────────────────────────────────── */
export const BUSINESS_TYPES = ['Hotel / guest house', 'Hospital / clinic / pharmacy', 'Wholesaler', 'Distributor', 'School', 'Office', 'Supermarket / shop', 'Church / NGO', 'Restaurant / chop bar', 'Cleaning company', 'Other']

export function Wholesale() {
  useSeo({ title: 'Wholesale & Bulk Orders', description: 'Wholesale prices on Evafresh cleaning products for hotels, schools, offices, supermarkets and resellers in Ghana.' })
  const [f, setF] = useState({ name: '', business: '', type: BUSINESS_TYPES[0], products: [], quantity: '', phone: '', email: '', location: '', notes: '' })
  const [err, setErr] = useState({})
  const [status, setStatus] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggleProduct = (name) => setF({ ...f, products: f.products.includes(name) ? f.products.filter((p) => p !== name) : [...f.products, name] })
  const productNames = products.filter((p) => p.type === 'product' && p.category !== 'accessories' && !p.collections.includes('refills')).map((p) => p.name.replace(/^Evafresh /, ''))
  const submit = async (e) => {
    e.preventDefault()
    const x = {}
    if (f.name.trim().length < 2) x.name = 'Please enter your name.'
    if (f.business.trim().length < 2) x.business = 'Please enter your business name.'
    if (!f.products.length) x.products = 'Choose at least one product.'
    if (!f.quantity.trim()) x.quantity = 'Tell us roughly how much you need.'
    if (!isValidGhPhone(f.phone)) x.phone = 'Enter a valid Ghana number, e.g. 024 123 4567.'
    setErr(x)
    if (Object.keys(x).length) return document.getElementById(Object.keys(x)[0] === 'products' ? 'products-legend' : Object.keys(x)[0])?.focus()
    const text = [
      'Hello Evaclear! I would like a wholesale / bulk quote.',
      `Name: ${f.name}`,
      `Business: ${f.business} (${f.type})`,
      `Products: ${f.products.join(', ')}`,
      `Quantity: ${f.quantity}`,
      `Phone: ${normaliseGhPhone(f.phone)}`,
      f.email && `Email: ${f.email}`,
      f.location && `Location: ${f.location}`,
      f.notes && `Notes: ${f.notes}`,
    ].filter(Boolean).join('\n')
    try {
      setStatus(await sendForm(site.forms.wholesaleEndpoint, { ...f, phone: normaliseGhPhone(f.phone) }, text))
    } catch {
      setStatus('error')
    }
  }
  const a = (k) => ({ 'aria-invalid': !!err[k], 'aria-describedby': err[k] ? `${k}-err` : undefined })
  return (
    <>
      <PageHero eyebrow="Wholesale" title="Bulk orders for business" intro="Hotels, schools, offices, supermarkets and resellers: get wholesale prices, 25L sizes and scheduled deliveries." tone="aqua" />
      <section className="container-x pt-12" aria-labelledby="bizpacks-title">
        <h2 id="bizpacks-title" className="text-3xl">
          Business starter packs
        </h2>
        <p className="mt-2 max-w-2xl text-muted">Ready-made packs you can order today. Need different products or quantities? Request a custom quote below.</p>
        <div className="mt-6 flex flex-col items-start gap-4 rounded-card bg-primary p-6 text-white sm:flex-row sm:items-center sm:justify-between on-dark">
          <div>
            <p className="font-heading text-2xl">Buy now, pay later</p>
            <p className="mt-1 text-white/85">Hotels, hospitals, schools, offices, wholesalers and distributors can apply for a credit account. Once approved, order online and pay within your agreed terms.</p>
          </div>
          <Link to="/account/register" className="btn btn-light shrink-0">
            Apply for a credit account
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {inCollection('business-packs').map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </section>
      <section className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl">Why businesses choose us</h2>
          <ul className="mt-5 space-y-3">
            {['Wholesale prices on bulk and 25L sizes', 'Regular scheduled deliveries', 'One supplier for every cleaning need', 'Invoices and receipts for your accounts', 'Resale support for shops and market traders'].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
          {site.bank?.enabled && (
            <div className="card mt-8 p-5">
              <h3 className="font-body text-lg font-bold">Paying for business orders</h3>
              <p className="mt-1 text-sm text-muted">Bank transfer, cash deposit, cheque or card. Cheques payable to {site.bank.accountName}.</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">Account name</dt>
                <dd className="font-semibold">{site.bank.accountName}</dd>
                <dt className="text-muted">Bank</dt>
                <dd className="font-semibold">{site.bank.bankName}, {site.bank.branch}</dd>
                <dt className="text-muted">Account no.</dt>
                <dd className="font-semibold tabular-nums">{site.bank.accountNumber}</dd>
                <dt className="text-muted">MoMo</dt>
                <dd className="font-semibold">{site.momo.display} ({site.momo.network})</dd>
              </dl>
            </div>
          )}
          <p className="mt-8 text-muted">Prefer to talk? Call {site.phones.join(', ')} or WhatsApp {site.whatsapp.display}.</p>
          <a href={waLink('Hello Evaclear! I’d like to ask about wholesale prices.')} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-4">
            <LuMessageCircle aria-hidden="true" /> WhatsApp our sales team
          </a>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl">Request a quote</h2>
          {status === 'sent' || status === 'whatsapp' ? (
            <p role="status" className="mt-4 rounded-xl bg-aqua-soft p-4 font-semibold">
              {status === 'sent' ? 'Thank you! We’ll send your quote within one working day.' : 'WhatsApp has opened with your request — tap Send and we’ll reply with a quote.'}
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField id="name" label="Your name" error={err.name}>
                <input id="name" className="field" autoComplete="name" value={f.name} onChange={set('name')} {...a('name')} />
              </FormField>
              <FormField id="business" label="Business name" error={err.business}>
                <input id="business" className="field" autoComplete="organization" value={f.business} onChange={set('business')} {...a('business')} />
              </FormField>
              <FormField id="type" label="Type of business">
                <select id="type" className="field" value={f.type} onChange={set('type')}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="location" label="Town / area" optional>
                <input id="location" className="field" value={f.location} onChange={set('location')} />
              </FormField>
              <fieldset className="sm:col-span-2" aria-describedby={err.products ? 'products-err' : undefined}>
                <legend id="products-legend" tabIndex={-1} className="label">
                  Products needed
                </legend>
                <div className="flex flex-wrap gap-2">
                  {productNames.map((n) => (
                    <label key={n} className={`cursor-pointer rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${f.products.includes(n) ? 'border-primary bg-primary text-white' : 'border-line bg-white'}`}>
                      <input type="checkbox" className="sr-only" checked={f.products.includes(n)} onChange={() => toggleProduct(n)} />
                      {n}
                    </label>
                  ))}
                </div>
                {err.products && (
                  <p id="products-err" className="mt-1 text-sm font-semibold text-danger">
                    {err.products}
                  </p>
                )}
              </fieldset>
              <FormField id="quantity" label="Quantity (e.g. 10 × 25L per month)" error={err.quantity}>
                <input id="quantity" className="field" value={f.quantity} onChange={set('quantity')} {...a('quantity')} />
              </FormField>
              <FormField id="phone" label="Phone (+233)" error={err.phone}>
                <input id="phone" type="tel" className="field" autoComplete="tel" placeholder="024 123 4567" value={f.phone} onChange={set('phone')} {...a('phone')} />
              </FormField>
              <FormField id="email" label="Email" optional>
                <input id="email" type="email" className="field" autoComplete="email" value={f.email} onChange={set('email')} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="notes" label="Anything else?" optional>
                  <textarea id="notes" rows={3} className="field" value={f.notes} onChange={set('notes')} />
                </FormField>
              </div>
              {status === 'error' && <p role="alert" className="font-semibold text-danger sm:col-span-2">Sorry, that didn’t send. Please WhatsApp or call us.</p>}
              <button type="submit" className="btn btn-primary sm:col-span-2 sm:justify-self-start">
                Request quote
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
