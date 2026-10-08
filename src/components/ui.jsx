import { useId, useRef, useState, useEffect } from 'react'
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuMinus, LuPlus, LuStar } from 'react-icons/lu'
import { ghs } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import site from '../data/site.json'

export function Stars({ rating = 0, size = 16, label = true }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label ? `Rated ${rating} out of 5` : undefined} role={label ? 'img' : undefined}>
      {[1, 2, 3, 4, 5].map((i) => (
        <LuStar key={i} aria-hidden="true" size={size} className={i <= full ? 'fill-primary text-primary' : 'text-line'} />
      ))}
    </span>
  )
}

export function Badge({ children, tone = 'lime' }) {
  if (!children) return null
  const tones = {
    lime: 'bg-lime text-ink',
    teal: 'bg-primary text-white',
    aqua: 'bg-aqua text-ink',
    sand: 'bg-sand text-ink',
  }
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide ${tones[tone]}`}>{children}</span>
}

export function SampleTag({ children = 'Sample content' }) {
  return (
    <span className="inline-block rounded-md border border-dashed border-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </span>
  )
}

export function Price({ price, compareAt, className = '' }) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="font-bold text-ink">{ghs(price)}</span>
      {compareAt ? (
        <>
          <s className="text-sm text-muted" aria-label={`was ${ghs(compareAt)}`}>
            {ghs(compareAt)}
          </s>
          <span className="text-xs font-bold text-primary">Save {ghs(compareAt - price)}</span>
        </>
      ) : null}
    </span>
  )
}

export function QtyControl({ value, onChange, label = 'Quantity', small = false }) {
  const h = small ? 'h-9 w-9' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white" role="group" aria-label={label}>
      <button type="button" className={`${h} grid place-items-center rounded-full hover:bg-sand`} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <LuMinus aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${h} grid place-items-center rounded-full hover:bg-sand`} onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <LuPlus aria-hidden="true" />
      </button>
    </div>
  )
}

export function SectionHeading({ eyebrow, title, intro, align = 'center', as: H = 'h2', action }) {
  return (
    <div className={`mb-8 flex flex-col gap-3 md:mb-10 ${align === 'center' ? 'items-center text-center' : 'items-start md:flex-row md:items-end md:justify-between'}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <H className="text-3xl sm:text-4xl">{title}</H>
        {intro && <p className="mt-3 text-muted sm:text-lg">{intro}</p>}
      </div>
      {action}
    </div>
  )
}

export function Accordion({ items, defaultOpen = -1, headingLevel = 3 }) {
  const [open, setOpen] = useState(defaultOpen)
  const base = useId()
  const H = `h${headingLevel}`
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <div key={i}>
            <H className="font-body text-base font-bold" style={{ fontFamily: 'var(--evc-font-body)' }}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
                aria-expanded={isOpen}
                aria-controls={`${base}-p${i}`}
                id={`${base}-b${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{it.title}</span>
                <LuChevronDown aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </H>
            <div id={`${base}-p${i}`} role="region" aria-labelledby={`${base}-b${i}`} hidden={!isOpen} className="pb-5 text-muted">
              {it.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Horizontal, swipeable carousel with previous/next buttons (scroll-snap based). */
export function Scroller({ label, children, itemClass = 'w-[78%] sm:w-[45%] lg:w-[23.5%]', gap = 'gap-4 lg:gap-6' }) {
  const ref = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const update = () => {
    const el = ref.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  useEffect(() => {
    update()
    const el = ref.current
    el?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [children])
  const scroll = (dir) => {
    const el = ref.current
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }
  const items = Array.isArray(children) ? children : [children]
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <ul ref={ref} className={`no-scrollbar relative -mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-4 sm:mx-0 sm:px-0 ${gap}`}>
        {items.map((child, i) => (
          <li key={i} className={`shrink-0 snap-start ${itemClass}`} aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`}>
            {child}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} disabled={edges.start} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white transition hover:border-primary disabled:opacity-40" aria-label={`Previous ${label}`}>
          <LuChevronLeft aria-hidden="true" />
        </button>
        <button type="button" onClick={() => scroll(1)} disabled={edges.end} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white transition hover:border-primary disabled:opacity-40" aria-label={`Next ${label}`}>
          <LuChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="py-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.to && i < items.length - 1 ? (
              <Link to={it.to} className="underline-offset-4 hover:text-primary hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className="text-ink">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function NewsletterForm({ dark = false, compact = false }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')
  const id = useId()
  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState('invalid')
    setState('sending')
    try {
      if (site.newsletter.endpoint) {
        await fetch(site.newsletter.endpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      }
      setState('done')
    } catch {
      setState('error')
    }
  }
  if (state === 'done')
    return (
      <p role="status" className={`rounded-2xl p-4 font-semibold ${dark ? 'bg-white/10 text-white' : 'bg-aqua-soft text-primary'}`}>
        Thank you for joining! Look out for cleaning tips and offers in your inbox.
      </p>
    )
  return (
    <form onSubmit={submit} noValidate className={`flex w-full flex-col gap-3 ${compact ? '' : 'sm:flex-row'}`}>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        required
        placeholder="Your email address"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (state !== 'idle') setState('idle')
        }}
        aria-invalid={state === 'invalid'}
        aria-describedby={state === 'invalid' ? `${id}-err` : undefined}
        className="field flex-1"
      />
      <button type="submit" className={`btn ${dark ? 'btn-light' : 'btn-primary'}`} disabled={state === 'sending'}>
        {state === 'sending' ? 'Joining…' : 'Subscribe'}
      </button>
      {state === 'invalid' && (
        <p id={`${id}-err`} className={`text-sm font-semibold ${dark ? 'text-lime' : 'text-danger'}`}>
          Please enter a valid email address.
        </p>
      )}
      {state === 'error' && <p className="text-sm font-semibold text-danger">Something went wrong. Please try again.</p>}
    </form>
  )
}

export function PageHero({ eyebrow, title, intro, children, tone = 'sand' }) {
  return (
    <section className={tone === 'aqua' ? 'bg-aqua-soft' : 'bg-sand'}>
      <div className="container-x py-12 text-center md:py-16">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        {intro && <p className="mx-auto mt-4 max-w-2xl text-muted sm:text-lg">{intro}</p>}
        {children}
      </div>
    </section>
  )
}
