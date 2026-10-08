import { useMemo, useState } from 'react'
import { LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { categoryCollections, getCollection, productsFor, searchProducts } from '../lib/catalog.js'
import { useSearchParams, Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { ghs } from '../lib/format.js'
import ProductCard from '../components/ProductCard.jsx'
import { Breadcrumbs } from '../components/ui.jsx'
import useDialog from '../lib/useDialog.js'
import NotFound from './NotFound.jsx'

const PRICE_RANGES = [
  { id: 'u50', label: `Under ${ghs(50)}`, test: (p) => p < 50 },
  { id: '50-100', label: `${ghs(50)} – ${ghs(100)}`, test: (p) => p >= 50 && p <= 100 },
  { id: '100-200', label: `${ghs(100)} – ${ghs(200)}`, test: (p) => p > 100 && p <= 200 },
  { id: 'o200', label: `Over ${ghs(200)}`, test: (p) => p > 200 },
]
const SORTS = [
  { id: 'best', label: 'Best selling' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'newest', label: 'Newest' },
]

/** "750ml spray" → "750ml", "2.5L refill" → "2.5L", "Kit of 6" → null */
export function sizeKey(size) {
  const m = /^(\d+(?:\.\d+)?)\s?(ml|l)\b/i.exec(size || '')
  if (!m) return null
  return `${m[1]}${m[2].toLowerCase() === 'ml' ? 'ml' : 'L'}`
}
const litres = (k) => (k.endsWith('ml') ? parseFloat(k) / 1000 : parseFloat(k))

function Box({ checked, onChange, label, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded accent-[var(--evc-primary)]" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-sm text-muted">{count}</span>}
    </label>
  )
}

function Filters({ cats, setCats, prices, setPrices, sizes, setSizes, sizeOptions, showCategories, counts }) {
  const toggle = (set, list, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  return (
    <div className="flex flex-col gap-6">
      {showCategories && (
        <fieldset>
          <legend className="mb-2 font-bold">Category</legend>
          {categoryCollections.map((c) => (
            <Box key={c.slug} checked={cats.includes(c.slug)} onChange={() => toggle(setCats, cats, c.slug)} label={c.title} count={counts[c.slug]} />
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 font-bold">Price</legend>
        {PRICE_RANGES.map((r) => (
          <Box key={r.id} checked={prices.includes(r.id)} onChange={() => toggle(setPrices, prices, r.id)} label={r.label} />
        ))}
      </fieldset>
      {sizeOptions.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-bold">Size</legend>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((s) => (
              <button key={s} type="button" aria-pressed={sizes.includes(s)} onClick={() => toggle(setSizes, sizes, s)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${sizes.includes(s) ? 'border-primary bg-primary text-white' : 'border-line bg-white hover:border-primary'}`}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

export default function Collection({ params }) {
  const slug = params.slug || 'shop-all'
  const collection = getCollection(slug)
  const sp = useSearchParams()
  const q = sp.get('q') || ''
  const [cats, setCats] = useState([])
  const [prices, setPrices] = useState([])
  const [sizes, setSizes] = useState([])
  const [sort, setSort] = useState('best')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const dialogRef = useDialog(filtersOpen, () => setFiltersOpen(false))

  const base = useMemo(() => (q ? searchProducts(q) : collection ? productsFor(collection) : []), [q, collection])
  const sizeOptions = useMemo(
    () => [...new Set(base.flatMap((p) => p.variants.map((v) => sizeKey(v.size)).filter(Boolean)))].sort((a, b) => litres(a) - litres(b)),
    [base],
  )
  const counts = useMemo(() => Object.fromEntries(categoryCollections.map((c) => [c.slug, productsFor(c).filter((p) => base.some((b) => b.id === p.id)).length])), [base])

  const list = useMemo(() => {
    let l = base.filter((p) => {
      if (cats.length && !cats.some((c) => p.category === c || (p.alsoIn || []).includes(c))) return false
      if (prices.length && !p.variants.some((v) => prices.some((id) => PRICE_RANGES.find((r) => r.id === id).test(v.price)))) return false
      if (sizes.length && !p.variants.some((v) => sizes.includes(sizeKey(v.size)))) return false
      return true
    })
    const minP = (p) => Math.min(...p.variants.map((v) => v.price))
    if (sort === 'best') l = [...l].sort((a, b) => a.popularity - b.popularity)
    if (sort === 'price-asc') l = [...l].sort((a, b) => minP(a) - minP(b))
    if (sort === 'price-desc') l = [...l].sort((a, b) => minP(b) - minP(a))
    if (sort === 'newest') l = [...l].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    return l
  }, [base, cats, prices, sizes, sort])

  const title = q ? `Search results for “${q}”` : collection?.title
  useSeo({
    title: q ? `Search: ${q}` : collection?.title,
    description: collection?.description,
    noindex: !!q,
    jsonLd: collection
      ? {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: collection.title,
          description: collection.description,
        }
      : undefined,
  })
  if (!collection && !q) return <NotFound />

  const activeCount = cats.length + prices.length + sizes.length
  const clear = () => {
    setCats([])
    setPrices([])
    setSizes([])
  }
  const filterProps = { cats, setCats, prices, setPrices, sizes, setSizes, sizeOptions, showCategories: slug === 'shop-all' || !!q || !collection?.isCategory, counts }

  return (
    <>
      <section className="bg-sand">
        <div className="container-x pb-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, ...(slug !== 'shop-all' && !q ? [{ label: collection.title }] : q ? [{ label: 'Search' }] : [])]} />
          <h1 className="text-4xl sm:text-5xl">{title}</h1>
          {!q && <p className="mt-3 max-w-2xl text-muted sm:text-lg">{collection.description}</p>}
          <ul className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Categories">
            {[{ slug: 'shop-all', title: 'All' }, ...categoryCollections].map((c) => (
              <li key={c.slug}>
                <Link to={c.slug === 'shop-all' ? '/shop' : `/collections/${c.slug}`} aria-current={c.slug === slug && !q ? 'page' : undefined} className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${c.slug === slug && !q ? 'bg-primary text-white' : 'bg-white hover:bg-aqua-soft'}`}>
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-28">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-body text-lg font-bold">Filter</h2>
                {activeCount > 0 && (
                  <button type="button" onClick={clear} className="text-sm font-semibold text-primary underline">
                    Clear all
                  </button>
                )}
              </div>
              <Filters {...filterProps} />
            </div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted" aria-live="polite">
                {list.length} product{list.length === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setFiltersOpen(true)} className="btn btn-outline min-h-11 py-2 lg:hidden" aria-haspopup="dialog">
                  <LuSlidersHorizontal aria-hidden="true" /> Filter{activeCount ? ` (${activeCount})` : ''}
                </button>
                <label htmlFor="sort" className="sr-only">
                  Sort by
                </label>
                <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="field min-h-11 w-auto py-2 pr-8">
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      Sort: {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {list.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-heading text-2xl">No products match</p>
                <p className="mt-2 text-muted">Try removing a filter, or browse all products.</p>
                <div className="mt-6 flex justify-center gap-3">
                  {activeCount > 0 && (
                    <button type="button" className="btn btn-primary" onClick={clear}>
                      Clear filters
                    </button>
                  )}
                  <Link to="/shop" className="btn btn-outline">
                    Shop all
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                {list.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} headingLevel={2} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-bg shadow-2xl fade-up">
            <div className="flex items-center justify-between border-b border-line p-5">
              <h2 className="font-body text-lg font-bold">Filter</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label="Close filters">
                <LuX size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <Filters {...filterProps} />
            </div>
            <div className="flex gap-2 border-t border-line p-5">
              <button type="button" onClick={clear} className="btn btn-outline flex-1">
                Clear
              </button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="btn btn-primary flex-1">
                Show {list.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

