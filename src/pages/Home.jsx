import { useEffect, useRef, useState } from 'react'
import {
  LuArrowRight, LuBaby, LuBuilding2, LuCheck, LuChevronLeft, LuChevronRight, LuChurch, LuHand, LuHotel, LuMapPin,
  LuMessageCircle, LuNewspaper, LuPause, LuPlay, LuPiggyBank, LuRecycle, LuSchool, LuSparkles, LuStore, LuTruck, LuShoppingCart,
} from 'react-icons/lu'
import site from '../data/site.json'
import press from '../data/press.json'
import testimonialData from '../data/testimonials.json'
import { inCollection, products, productUrl, startingKitPrice } from '../lib/catalog.js'
import { ghs } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { waLink } from '../lib/whatsapp.js'
import { FREE_THRESHOLD, HOME_AREA } from '../lib/delivery.js'
import Img, { asset } from '../lib/Img.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { NewsletterForm, SampleTag, Scroller, SectionHeading } from '../components/ui.jsx'
import { SocialLinks } from '../components/Footer.jsx'

/* 1 ─ HERO ─────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-aqua-soft to-bg">
      <div className="container-x grid items-center gap-8 py-8 md:py-14 lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:py-20">
        <div className="order-2 lg:order-1 fade-up">
          <p className="eyebrow mb-4">Evafresh by {site.name}</p>
          <h1 className="text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">Meet Your New Fresh Home Lineup</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Liquid soap, floor cleaner, bleach, fabric softener and more, in everyday sizes and big money-saving refills, delivered across Ghana.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/collections/starter-packs" className="btn btn-primary px-8">
              Shop Kits <LuArrowRight aria-hidden="true" />
            </Link>
            <a href={waLink('Hello Evaclear! I would like to order.')} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              <LuMessageCircle aria-hidden="true" /> Order on WhatsApp
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted">
            <li className="flex items-center gap-2">
              <LuTruck className="text-primary" aria-hidden="true" /> Free {HOME_AREA} delivery over {ghs(FREE_THRESHOLD)}
            </li>
            <li className="flex items-center gap-2">
              <LuCheck className="text-primary" aria-hidden="true" /> Pay with Mobile Money
            </li>
          </ul>
        </div>
        <div className="relative order-1 lg:order-2">
          <div aria-hidden="true" className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-aqua/50 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-10 -left-6 h-48 w-48 rounded-full bg-lime/40 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-xl">
            <Img
              src="evafresh-lineup"
              alt="The Evafresh range: multipurpose liquid soap, bleach, floor cleaner, stain remover, antiseptic, glass cleaner and hand wash"
              className="aspect-[3/2] w-full"
              fit="cover"
              priority
              sizesAttr="(min-width: 1024px) 55vw, 100vw"
            />
          </div>
          <div className="absolute -bottom-4 left-4 rounded-2xl bg-lime px-5 py-3 shadow-lg sm:left-8">
            <p className="text-xs font-bold uppercase tracking-wider">Starting at</p>
            <p className="font-heading text-2xl font-semibold">{ghs(startingKitPrice())}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* 2 ─ TRUSTED BY (auto-scrolling logo strip) ───────────────────────────── */
const trustIcons = { store: LuStore, market: LuShoppingCart, hotel: LuHotel, school: LuSchool, office: LuBuilding2, media: LuNewspaper, community: LuChurch }

function TrustedBy() {
  const [paused, setPaused] = useState(false)
  const items = press.trustedBy
  const Tile = ({ t }) => {
    const Icon = trustIcons[t.kind] || LuStore
    return (
      <span className="mx-3 flex h-16 shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-6 text-muted">
        <Icon size={22} aria-hidden="true" className="text-primary" />
        <span className="whitespace-nowrap font-semibold">{t.label}</span>
      </span>
    )
  }
  return (
    <section aria-labelledby="trusted-title" className="border-y border-line bg-bg py-10">
      <div className="container-x mb-6 flex flex-col items-center gap-2 text-center">
        <h2 id="trusted-title" className="font-body text-sm font-bold uppercase tracking-[0.14em] text-muted">
          Trusted by homes, shops, hotels and schools across Ghana
        </h2>
        <div className="flex items-center gap-3">
          <SampleTag>Placeholder logos</SampleTag>
          <button type="button" onClick={() => setPaused(!paused)} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted hover:bg-sand" aria-pressed={paused}>
            {paused ? <LuPlay aria-hidden="true" /> : <LuPause aria-hidden="true" />} {paused ? 'Play' : 'Pause'} logos
          </button>
        </div>
      </div>
      <div className="marquee relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" data-paused={paused}>
        <ul className="marquee-track flex w-max">
          {[...items, ...items].map((t, i) => (
            <li key={i} aria-hidden={i >= items.length ? 'true' : undefined}>
              <Tile t={t} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 3 ─ CLEANING FOR EVERY HOME (tabbed carousel) ───────────────────────── */
const TABS = [
  { id: 'starter-packs', label: 'Starter Packs' },
  { id: 'refills', label: 'Refills' },
  { id: 'accessories', label: 'Accessories' },
]

function TabbedProducts() {
  const [tab, setTab] = useState(0)
  const btns = useRef([])
  const onKey = (e) => {
    let n = null
    if (e.key === 'ArrowRight') n = (tab + 1) % TABS.length
    if (e.key === 'ArrowLeft') n = (tab - 1 + TABS.length) % TABS.length
    if (e.key === 'Home') n = 0
    if (e.key === 'End') n = TABS.length - 1
    if (n !== null) {
      e.preventDefault()
      setTab(n)
      btns.current[n]?.focus()
    }
  }
  const list = inCollection(TABS[tab].id)
  return (
    <section className="py-16 md:py-24" aria-labelledby="every-home-title">
      <div className="container-x">
        <SectionHeading eyebrow="Shop the range" title={<span id="every-home-title">Cleaning for Every Home</span>} intro="Start with a kit, stock up with big refills, and add the accessories that make cleaning easier." />
        <div role="tablist" aria-label="Product groups" className="mx-auto mb-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-sand p-1 no-scrollbar" onKeyDown={onKey}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => (btns.current[i] = el)}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === i}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition sm:px-6 ${tab === i ? 'bg-primary text-white shadow' : 'text-ink hover:bg-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${TABS[tab].id}`} aria-labelledby={`tab-${TABS[tab].id}`} key={tab} className="fade-up">
          <Scroller label={TABS[tab].label}>
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Scroller>
        </div>
        <div className="mt-6 text-center">
          <Link to="/shop" className="btn btn-outline px-8">
            Shop All
          </Link>
        </div>
      </div>
    </section>
  )
}

/* 4 ─ EVERYTHING YOU NEED (interactive numbered list) ──────────────────── */
function EverythingYouNeed() {
  const lineup = products.filter((p) => p.lineupOrder).sort((a, b) => a.lineupOrder - b.lineupOrder)
  const [i, setI] = useState(0)
  const btns = useRef([])
  const p = lineup[i]
  const onKey = (e) => {
    let n = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % lineup.length
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + lineup.length) % lineup.length
    if (n !== null) {
      e.preventDefault()
      setI(n)
      btns.current[n]?.focus()
    }
  }
  return (
    <section className="bg-sand py-16 md:py-24" aria-labelledby="everything-title">
      <div className="container-x">
        <SectionHeading eyebrow="The Evafresh lineup" title={<span id="everything-title">Everything You Need for a Clean Home</span>} intro="Pick a product to see what it's for." />
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-12">
          <ol role="tablist" aria-orientation="vertical" aria-label="Evafresh products" onKeyDown={onKey} className="flex flex-col gap-1">
            {lineup.map((x, n) => (
              <li key={x.id} role="presentation">
                <button
                  ref={(el) => (btns.current[n] = el)}
                  role="tab"
                  id={`ln-tab-${n}`}
                  aria-selected={i === n}
                  aria-controls="ln-panel"
                  tabIndex={i === n ? 0 : -1}
                  onClick={(e) => {
                    setI(n)
                    // on phones the details sit below the list: bring them into view
                    if (e.detail > 0 && window.innerWidth < 1024) setTimeout(() => document.getElementById('ln-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition ${i === n ? 'bg-white shadow-md' : 'hover:bg-white/60'}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-heading text-lg ${i === n ? 'bg-primary text-white' : 'bg-white text-primary'}`}>{String(n + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block font-bold">{x.name.replace(/^Evafresh /, '')}</span>
                    <span className="block text-sm text-muted">{x.tagline}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div id="ln-panel" role="tabpanel" aria-labelledby={`ln-tab-${i}`} className="card scroll-mt-24 overflow-hidden lg:sticky lg:top-28 lg:self-start" key={p.id}>
            <div className="fade-up">
              <Img src={p.images[0]} alt={p.name} className="aspect-[3/2] w-full bg-white" sizesAttr="(min-width:1024px) 50vw, 100vw" />
              <div className="p-6 sm:p-8">
                <h3 className="text-2xl">{p.name}</h3>
                <p className="mt-2 text-muted">{p.shortDescription}</p>
                <p className="eyebrow mb-3 mt-6">Used for</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {p.usedFor.map((u) => (
                    <li key={u} className="flex items-start gap-2">
                      <LuCheck className="mt-1 shrink-0 text-primary" aria-hidden="true" /> {u}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link to={productUrl(p)} className="btn btn-primary">
                    Shop {p.name.replace(/^Evafresh /, '')}
                  </Link>
                  <span className="text-muted">From {ghs(p.minPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* 5 ─ TESTIMONIALS ─────────────────────────────────────────────────────── */
function Testimonials() {
  const list = testimonialData.testimonials
  const [i, setI] = useState(0)
  const t = list[i]
  const go = (d) => setI((i + d + list.length) % list.length)
  return (
    <section className="py-16 md:py-24" aria-labelledby="testimonials-title" aria-roledescription="carousel">
      <div className="container-x">
        <SectionHeading eyebrow="Reviews" title={<span id="testimonials-title">What Customers Are Saying</span>} />
        <div className="card mx-auto grid max-w-5xl overflow-hidden md:grid-cols-[1fr_1.3fr]" aria-live="polite">
          <Img key={`img-${i}`} src={t.productImage} alt="" className="fade-up aspect-[4/3] h-full w-full bg-white md:aspect-auto" fit="cover" sizesAttr="(min-width:768px) 40vw, 100vw" />
          <figure key={i} className="fade-up flex flex-col justify-center p-6 sm:p-10" aria-roledescription="slide" aria-label={`${i + 1} of ${list.length}`}>
            {t.sample && (
              <div className="mb-4">
                <SampleTag>Sample testimonial — replace with a real customer</SampleTag>
              </div>
            )}
            <blockquote>
              <p className="font-heading text-2xl leading-snug sm:text-3xl">{t.headline}</p>
              <p className="mt-4 text-muted">{t.quote}</p>
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <img src={asset(t.image)} alt="" width="48" height="48" loading="lazy" className="h-12 w-12 rounded-full" />
              <span>
                <span className="block font-bold">{t.name}</span>
                <span className="block text-sm text-muted">
                  {t.location} · bought {t.product}
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white hover:border-primary" aria-label="Previous testimonial">
            <LuChevronLeft aria-hidden="true" />
          </button>
          <div className="flex gap-1">
            {list.map((_, n) => (
              <button key={n} type="button" onClick={() => setI(n)} aria-label={`Show testimonial ${n + 1}`} aria-current={n === i} className="grid h-8 w-8 place-items-center">
                <span className={`block h-2.5 rounded-full transition-all ${n === i ? 'w-6 bg-primary' : 'w-2.5 bg-line'}`} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(1)} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white hover:border-primary" aria-label="Next testimonial">
            <LuChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

/* 6 ─ WHY EVACLEAR ─────────────────────────────────────────────────────── */
// Product claims only show once you set them to true in src/data/site.json → "claims"
const CLAIMS = [
  { key: 'toughOnStains', Icon: LuSparkles, title: 'Effective on tough stains', text: 'Cuts through grease, soap scum, rust and everyday grime.' },
  { key: 'gentleOnSkin', Icon: LuHand, title: 'Gentle on skin', text: 'Formulated to be kind to hands when used as directed.' },
  { key: 'locallyMade', Icon: LuMapPin, title: 'Made in Ghana', text: 'Produced locally, supporting Ghanaian jobs and businesses.' },
  { key: 'valueConcentrates', Icon: LuPiggyBank, title: 'Value for money', text: 'Big sizes and refills bring the cost per litre right down.' },
  { key: 'lessPlastic', Icon: LuRecycle, title: 'Less plastic', text: 'Refill the bottles you own instead of buying new ones.' },
  { key: 'safeAroundKids', Icon: LuBaby, title: 'Safer around children & pets', text: 'Suitable for family homes when used and stored as directed.' },
]
// Service facts (always shown — edit freely)
const SERVICES = [
  { Icon: LuTruck, title: 'Delivered across Ghana', text: `Same or next-day delivery in ${HOME_AREA}, free over ${ghs(FREE_THRESHOLD)}.` },
  { Icon: LuMessageCircle, title: 'Order your way', text: 'Pay by Mobile Money at checkout, or order on WhatsApp first.' },
]

function WhyEvaclear() {
  const claims = CLAIMS.filter((c) => site.claims[c.key] || site.claims.previewUnconfirmed)
  const all = [...claims, ...SERVICES]
  return (
    <section className="on-dark bg-primary py-16 text-white md:py-24" aria-labelledby="why-title">
      <div className="container-x">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-2 !text-lime">Why choose us</p>
          <h2 id="why-title" className="text-3xl sm:text-4xl">
            Why {site.name}
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {all.map(({ key, Icon, title, text }) => (
            <li key={title} className="rounded-card bg-white/[0.07] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-lime text-ink">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-body text-lg font-bold">{title}</h3>
              <p className="mt-1 text-white/80">{text}</p>
              {key && !site.claims[key] && (
                <p className="mt-3 inline-block rounded-md border border-dashed border-lime/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-lime">Needs your confirmation</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 7 ─ STORY / EDUCATION ────────────────────────────────────────────────── */
const STORIES = [
  { title: 'Our Story', text: 'Why we started Evaclear: quality cleaning products at fair prices for every Ghanaian home.', image: 'real-products-table', to: '/our-story', cta: 'Read our story' },
  { title: 'Cleaning Tips & Home Care', text: 'Palm-oil pots, white uniforms, harmattan dust: practical guides for Ghanaian homes.', image: 'liquid-soap-lemon-range', to: '/tips', cta: 'Get cleaning tips' },
  { title: 'How to Use Our Products', text: 'Simple dilution guides and safety tips so every bottle goes further.', image: 'real-jugs-row', to: '/how-it-works', cta: 'See how it works' },
]

function StoryCarousel() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="learn-title">
      <div className="container-x">
        <SectionHeading eyebrow="Learn" title={<span id="learn-title">Cleaner Homes Start Here</span>} />
        <Scroller label="Stories and guides" itemClass="w-[85%] sm:w-[48%] lg:w-[32%]">
          {STORIES.map((s) => (
            <article key={s.title} className="card group flex h-full flex-col overflow-hidden">
              <div className="overflow-hidden">
                <Img src={s.image} alt="" className="aspect-[4/3] w-full bg-white transition duration-500 group-hover:scale-105" fit="cover" sizesAttr="(min-width:1024px) 33vw, 85vw" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl">{s.title}</h3>
                <p className="mt-2 flex-1 text-muted">{s.text}</p>
                <Link to={s.to} className="btn btn-outline mt-5 self-start">
                  Learn More <span className="sr-only">: {s.title}</span>
                </Link>
              </div>
            </article>
          ))}
        </Scroller>
      </div>
    </section>
  )
}

/* 8 ─ PRESS QUOTES ─────────────────────────────────────────────────────── */
function PressQuotes() {
  const list = press.quotes
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % list.length), 6000)
    return () => clearInterval(t)
  }, [paused, list.length])
  return (
    <section className="bg-aqua-soft py-16 md:py-20" aria-labelledby="press-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
      <div className="container-x text-center">
        <h2 id="press-title" className="sr-only">
          What people are saying
        </h2>
        <SampleTag>Placeholder press quotes</SampleTag>
        <blockquote key={i} className="fade-up mx-auto mt-6 max-w-3xl font-heading text-2xl leading-snug sm:text-4xl" aria-live={paused ? 'polite' : 'off'}>
          “{list[i].quote}”
          <footer className="mt-4 font-body text-base font-semibold text-muted">— {list[i].source}</footer>
        </blockquote>
        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {list.map((q, n) => (
            <li key={q.source}>
              <button
                type="button"
                onClick={() => setI(n)}
                aria-pressed={n === i}
                aria-label={`Show quote from ${q.source}`}
                className={`flex h-14 items-center rounded-xl border px-5 font-heading text-sm font-semibold transition ${n === i ? 'border-primary bg-white text-primary shadow' : 'border-transparent bg-white/60 text-muted opacity-70 hover:opacity-100'}`}
              >
                {q.source.replace('Sample ', '')}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setPaused(!paused)} className="mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted hover:bg-white" aria-pressed={paused}>
          {paused ? <LuPlay aria-hidden="true" /> : <LuPause aria-hidden="true" />} {paused ? 'Resume' : 'Pause'} rotation
        </button>
      </div>
    </section>
  )
}

/* 9 ─ JOIN OUR MOVEMENT ────────────────────────────────────────────────── */
function JoinMovement() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="join-title">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2rem] bg-sand p-8 sm:p-12 lg:p-16">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-aqua/60 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="eyebrow mb-2">Join our movement</p>
              <h2 id="join-title" className="text-3xl sm:text-4xl">
                Cleaner homes, smarter spending
              </h2>
              <p className="mt-3 text-muted sm:text-lg">Get cleaning tips, new product news and members-only offers. No spam, unsubscribe any time.</p>
            </div>
            <div className="flex flex-col gap-5">
              <NewsletterForm />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-muted">Follow us:</span>
                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useSeo({
    title: null,
    description: site.defaultDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: site.legalName,
      url: site.siteUrl,
      telephone: site.phone,
      email: site.email,
      image: `${site.siteUrl}/og-image.jpg`,
      priceRange: 'GH₵',
      currenciesAccepted: 'GHS',
      paymentAccepted: 'Mobile Money, Visa, Mastercard',
      address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, addressCountry: 'GH' },
      sameAs: Object.values(site.social),
    },
  })
  return (
    <>
      <Hero />
      <TrustedBy />
      <TabbedProducts />
      <EverythingYouNeed />
      <Testimonials />
      <WhyEvaclear />
      <StoryCarousel />
      <PressQuotes />
      <JoinMovement />
    </>
  )
}
