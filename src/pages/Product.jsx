import { useEffect, useMemo, useRef, useState } from 'react'
import { LuCheck, LuClock, LuMessageCircle, LuShoppingBag, LuStore, LuTriangleAlert, LuTruck } from 'react-icons/lu'
import site from '../data/site.json'
import { collections, compareAtFor, crossSellFor, getProduct, getVariant, productUrl, reviewSummary } from '../lib/catalog.js'
import { FREE_THRESHOLD, HOME_AREA, pickup, zones } from '../lib/delivery.js'
import { formatDate, ghs } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { waLink } from '../lib/whatsapp.js'
import Img, { photoUrl } from '../lib/Img.jsx'
import { useCart, variantLabel } from '../context/CartContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Accordion, Badge, Breadcrumbs, Price, QtyControl, SampleTag, Scroller, Stars } from '../components/ui.jsx'
import NotFound from './NotFound.jsx'

function Gallery({ images, name, activeImage }) {
  const [i, setI] = useState(0)
  const list = useMemo(() => [...new Set([activeImage, ...images].filter(Boolean))], [images, activeImage])
  useEffect(() => setI(0), [activeImage])
  const current = list[i] || list[0]
  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-28">
      <div className="card overflow-hidden bg-white">
        <Img key={current} src={current} alt={`${name}${i > 0 ? ` — photo ${i + 1}` : ''}`} className="fade-up aspect-square w-full" priority={i === 0} sizesAttr="(min-width:1024px) 50vw, 100vw" />
      </div>
      {list.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Product photos">
          {list.map((src, n) => (
            <li key={src} className="shrink-0">
              <button type="button" onClick={() => setI(n)} aria-label={`Show photo ${n + 1} of ${list.length}`} aria-current={n === i} className={`block overflow-hidden rounded-xl border-2 bg-white transition ${n === i ? 'border-primary' : 'border-transparent opacity-75 hover:opacity-100'}`}>
                <Img src={src} alt="" className="h-20 w-20" sizesAttr="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OptionPills({ legend, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">
        {legend}: <span className="font-normal text-muted">{value}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${value === o ? 'border-primary bg-primary text-white' : 'border-line bg-white hover:border-primary'}`}>
            <input type="radio" name={legend} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function DeliveryInfo() {
  return (
    <div className="rounded-2xl bg-aqua-soft p-5">
      <p className="flex items-center gap-2 font-bold">
        <LuTruck aria-hidden="true" className="text-primary" /> Delivery & pickup
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {zones.map((z) => (
          <li key={z.id} className="flex flex-wrap justify-between gap-x-4">
            <span>
              <strong>{z.name}</strong> <span className="text-muted">· {z.estimate}</span>
            </span>
            <span className="font-semibold">{z.freeAboveThreshold ? `${ghs(z.fee)} · free over ${ghs(FREE_THRESHOLD)}` : ghs(z.fee)}</span>
          </li>
        ))}
        {pickup.enabled && (
          <li className="flex flex-wrap justify-between gap-x-4">
            <span>
              <LuStore className="mr-1 inline" aria-hidden="true" />
              <strong>{pickup.name}</strong> <span className="text-muted">· {pickup.estimate}</span>
            </span>
            <span className="font-semibold">Free</span>
          </li>
        )}
      </ul>
    </div>
  )
}

function Reviews({ productId }) {
  const { count, average, list } = reviewSummary(productId)
  return (
    <section aria-labelledby="reviews-title" className="py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-title" className="text-3xl">
            Customer reviews
          </h2>
          {count > 0 && (
            <p className="mt-2 flex items-center gap-2 text-muted">
              <Stars rating={average} /> {average} out of 5 · {count} review{count === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <a href={waLink(`Hello Evaclear! I'd like to leave a review for ${getProduct(productId)?.name}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          Write a review on WhatsApp
        </a>
      </div>
      {count === 0 ? (
        <p className="card p-6 text-muted">No reviews yet. Bought this product? We'd love to hear what you think.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((r, n) => (
            <li key={n} className="card p-6">
              <div className="flex items-center justify-between gap-2">
                <Stars rating={r.rating} size={15} />
                {r.sample && <SampleTag>Sample review</SampleTag>}
              </div>
              <h3 className="mt-3 font-body text-lg font-bold">{r.title}</h3>
              <p className="mt-1 text-muted">{r.body}</p>
              <p className="mt-3 text-sm">
                <strong>{r.name}</strong>, {r.location} · <time dateTime={r.date}>{formatDate(r.date)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Product({ params }) {
  const product = getProduct(params.slug)
  const { add } = useCart()
  const scents = useMemo(() => (product ? [...new Set(product.variants.map((v) => v.scent).filter(Boolean))] : []), [product])
  const [scent, setScent] = useState(scents[0])
  const sizesForScent = useMemo(() => (product ? [...new Set(product.variants.filter((v) => !scent || v.scent === scent).map((v) => v.size))] : []), [product, scent])
  const [size, setSize] = useState(product?.variants[0].size)
  const [qty, setQty] = useState(1)
  const buyRef = useRef(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    if (sizesForScent.length && !sizesForScent.includes(size)) setSize(sizesForScent[0])
  }, [sizesForScent, size])

  useEffect(() => {
    const el = buyRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [product])

  const variant = product ? product.variants.find((v) => (!scent || v.scent === scent) && v.size === size) || product.variants[0] : null
  const summary = product ? reviewSummary(product.id) : null
  const realReviews = summary ? summary.list.filter((r) => !r.sample) : []
  const primaryCollection = product ? collections.find((c) => c.slug === product.category) || collections.find((c) => product.collections.includes(c.slug)) : null

  useSeo(
    product
      ? {
          title: product.name,
          description: `${product.shortDescription} From ${ghs(Math.min(...product.variants.map((v) => v.price)))}. Delivery across Ghana.`,
          image: photoUrl(product.images[0]),
          type: 'product',
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.description,
              image: product.images.map((i) => `${site.siteUrl}${photoUrl(i).replace(/^\.?\//, '/')}`),
              sku: product.id,
              brand: { '@type': 'Brand', name: product.type === 'bundle' ? site.name : site.productBrand || site.name },
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'GHS',
                lowPrice: Math.min(...product.variants.map((v) => v.price)),
                highPrice: Math.max(...product.variants.map((v) => v.price)),
                offerCount: product.variants.length,
                availability: 'https://schema.org/InStock',
                seller: { '@type': 'Organization', name: site.legalName },
              },
              // Only genuine (non-sample) reviews are given to search engines
              ...(realReviews.length
                ? {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: (realReviews.reduce((s, r) => s + r.rating, 0) / realReviews.length).toFixed(1),
                      reviewCount: realReviews.length,
                    },
                  }
                : {}),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: site.siteUrl },
                { '@type': 'ListItem', position: 2, name: 'Shop', item: `${site.siteUrl}/shop` },
                { '@type': 'ListItem', position: 3, name: product.name, item: `${site.siteUrl}${productUrl(product)}` },
              ],
            },
          ],
        }
      : { title: 'Product not found', noindex: true },
  )
  if (!product) return <NotFound />

  const compareAt = compareAtFor(product, variant)
  const crossSell = crossSellFor(product)
  const isAcid = /CORROSIVE|DANGER/i.test(product.safety)
  const addToCart = () => add(product.id, variant.id, qty)
  const waOrder = waLink(`Hello Evaclear! I'd like to order ${qty} × ${product.name} (${variantLabel(variant)}).`)

  const accordion = [
    {
      title: 'Ingredients',
      content: <p>{product.ingredients}</p>,
    },
    {
      title: 'How to use',
      content: (
        <ol className="list-decimal space-y-1 pl-5">
          {product.howToUse.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ),
    },
    product.safety && {
      title: 'Safety & storage',
      content: <p>{product.safety}</p>,
    },
  ].filter(Boolean)

  return (
    <>
      <div className="container-x">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, ...(primaryCollection ? [{ label: primaryCollection.title, to: `/collections/${primaryCollection.slug}` }] : []), { label: product.name }]} />
      </div>

      <section className="container-x grid gap-8 pb-12 lg:grid-cols-2 lg:gap-14">
        <Gallery images={product.images} name={product.name} activeImage={variant.image} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.badge && <Badge>{product.badge}</Badge>}
            <p className="eyebrow">{product.tagline}</p>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl">{product.name}</h1>
          {summary.count > 0 && (
            <a href="#reviews-title" onClick={(e) => { e.preventDefault(); document.getElementById('reviews-title')?.scrollIntoView({ behavior: 'smooth' }) }} className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
              <Stars rating={summary.average} /> {summary.count} review{summary.count === 1 ? '' : 's'}
            </a>
          )}
          <p className="mt-4 text-lg text-muted">{product.description}</p>

          <div className="mt-6 text-2xl">
            <Price price={variant.price} compareAt={compareAt} />
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {scents.length > 0 && <OptionPills legend="Scent" options={scents} value={scent} onChange={setScent} />}
            {product.variants.length > 1 && <OptionPills legend="Size" options={sizesForScent} value={size} onChange={setSize} />}
            {product.variants.length === 1 && <p className="text-sm"><strong>Size:</strong> {variant.size}</p>}
          </div>

          <div ref={buyRef} className="mt-6 flex flex-wrap items-center gap-3">
            <QtyControl value={qty} onChange={(n) => setQty(Math.max(1, Math.min(99, n)))} />
            <button type="button" onClick={addToCart} className="btn btn-primary flex-1 px-8">
              <LuShoppingBag aria-hidden="true" /> Add to Cart · {ghs(variant.price * qty)}
            </button>
          </div>
          <a href={waOrder} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-3 w-full">
            <LuMessageCircle aria-hidden="true" /> Order this on WhatsApp
          </a>

          {isAcid && (
            <p className="mt-5 flex gap-3 rounded-2xl border-2 border-danger/30 bg-[#fdecea] p-4 text-sm text-[#7a1a12]">
              <LuTriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>Corrosive product.</strong> Wear gloves, keep away from children and never mix with bleach or other cleaners.
              </span>
            </p>
          )}

          {product.benefits?.length > 0 && (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <LuCheck className="mt-1 shrink-0 text-primary" aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
          )}

          {product.includes && (
            <div className="card mt-6 p-5">
              <h2 className="font-body text-lg font-bold">What's inside</h2>
              <ul className="mt-3 divide-y divide-line">
                {product.includes.map((it) => {
                  const p = getProduct(it.productId)
                  const v = getVariant(p, it.variantId)
                  return (
                    <li key={it.variantId} className="flex items-center gap-3 py-2">
                      <Img src={v.image || p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white" sizesAttr="48px" />
                      <Link to={productUrl(p)} className="flex-1 text-sm font-semibold hover:text-primary">
                        {it.qty} × {p.name} <span className="font-normal text-muted">({variantLabel(v)})</span>
                      </Link>
                      <span className="text-sm text-muted">{ghs(v.price * it.qty)}</span>
                    </li>
                  )
                })}
              </ul>
              {compareAt && (
                <p className="mt-3 rounded-xl bg-lime/50 p-3 text-sm font-semibold">
                  Worth {ghs(compareAt)} separately — you save {ghs(compareAt - variant.price)} ({Math.round(((compareAt - variant.price) / compareAt) * 100)}%)
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            <DeliveryInfo />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <LuClock aria-hidden="true" /> Order before 12pm for same-day {HOME_AREA} delivery.
          </p>

          <div className="mt-8">
            <Accordion items={accordion} headingLevel={2} />
          </div>
        </div>
      </section>

      {product.dilution?.length > 0 && (
        <section className="bg-sand py-12" aria-labelledby="dilution-title">
          <div className="container-x">
            <h2 id="dilution-title" className="text-3xl">
              Usage & dilution guide
            </h2>
            <div className="card mt-6 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <caption className="sr-only">How much {product.name} to use</caption>
                <thead className="bg-primary text-white">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      Job
                    </th>
                    <th scope="col" className="px-5 py-3">
                      How much to use
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.dilution.map((d) => (
                    <tr key={d.use} className="border-t border-line">
                      <th scope="row" className="px-5 py-3 font-semibold">
                        {d.use}
                      </th>
                      <td className="px-5 py-3 text-muted">{d.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted">Never mix different cleaning products. Always follow the label.</p>
          </div>
        </section>
      )}

      <div className="container-x">
        {product.faqs?.length > 0 && (
          <section aria-labelledby="pfaq-title" className="pt-12">
            <h2 id="pfaq-title" className="mb-4 text-3xl">
              Questions about this product
            </h2>
            <Accordion items={product.faqs.map((f) => ({ title: f.q, content: <p>{f.a}</p> }))} />
          </section>
        )}
        <Reviews productId={product.id} />
      </div>

      {crossSell.length > 0 && (
        <section className="bg-aqua-soft py-12 md:py-16" aria-labelledby="xsell-title">
          <div className="container-x">
            <h2 id="xsell-title" className="mb-6 text-3xl">
              Complete your set
            </h2>
            <Scroller label="Complete your set">
              {crossSell.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </Scroller>
          </div>
        </section>
      )}

      {/* Sticky add-to-cart (mobile) */}
      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,.2)] backdrop-blur transition-transform duration-300 lg:hidden ${showSticky ? 'translate-y-0' : 'translate-y-full'}`} aria-hidden={!showSticky}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{product.name}</p>
            <p className="text-sm text-muted">
              {variantLabel(variant)} · {ghs(variant.price)}
            </p>
          </div>
          <button type="button" onClick={addToCart} className="btn btn-primary shrink-0" tabIndex={showSticky ? 0 : -1}>
            Add to Cart
          </button>
        </div>
      </div>
    </>
  )
}
