import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuArrowRight, LuSearch, LuX } from 'react-icons/lu'
import site from '../data/site.json'
import { products, productUrl, searchProducts } from '../lib/catalog.js'
import { ghs } from '../lib/format.js'
import { Link, useRouter } from '../lib/router.jsx'
import Img from '../lib/Img.jsx'
import useDialog from '../lib/useDialog.js'

export default function SearchPanel({ open, onClose }) {
  const ref = useDialog(open, onClose)
  const [q, setQ] = useState('')
  const { navigate } = useRouter()
  const results = useMemo(() => searchProducts(q), [q])
  const popular = useMemo(() => [...products].filter((p) => p.type === 'product').sort((a, b) => a.popularity - b.popularity).slice(0, 4), [])
  if (!open) return null

  const go = (term) => {
    onClose()
    navigate(`/shop?q=${encodeURIComponent(term)}`)
  }
  const list = q.trim() ? results.slice(0, 6) : popular

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Search" className="relative max-h-[90vh] overflow-y-auto bg-bg shadow-2xl fade-up">
        <div className="container-x py-6">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) go(q.trim())
            }}
            className="flex items-center gap-3"
          >
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <div className="relative flex-1">
              <LuSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="site-search"
                data-autofocus
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search liquid soap, bleach, 5L refill…"
                className="field rounded-full pl-11 text-lg"
                autoComplete="off"
              />
            </div>
            <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="Close search">
              <LuX size={22} aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 grid gap-8 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="eyebrow mb-3">Popular searches</p>
              <ul className="flex flex-wrap gap-2">
                {site.popularSearches.map((t) => (
                  <li key={t}>
                    <button type="button" onClick={() => go(t)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-3" aria-live="polite">
                {q.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Popular products'}
              </p>
              {q.trim() && results.length === 0 ? (
                <p className="text-muted">No products match “{q}”. Try another word, or ask us on WhatsApp.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link to={productUrl(p)} onClick={onClose} className="flex items-center gap-3 rounded-2xl bg-white p-2 transition hover:shadow-md">
                        <Img src={p.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white" sizesAttr="64px" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="text-sm text-muted">From {ghs(p.minPrice)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {q.trim() && results.length > 0 && (
                <button type="button" onClick={() => go(q.trim())} className="mt-4 inline-flex items-center gap-2 font-bold text-primary hover:underline">
                  See all results <LuArrowRight aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
