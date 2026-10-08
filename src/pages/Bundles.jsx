import { LuCheck, LuShoppingBag } from 'react-icons/lu'
import { bundleWorth, getProduct, getVariant, inCollection, productUrl } from '../lib/catalog.js'
import { ghs } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import Img from '../lib/Img.jsx'
import { useCart, variantLabel } from '../context/CartContext.jsx'
import { Badge, PageHero } from '../components/ui.jsx'

function BundleRow({ p, reverse }) {
  const { add } = useCart()
  const v = p.variants[0]
  const worth = bundleWorth(p)
  const save = worth - v.price
  return (
    <article className="card grid overflow-hidden md:grid-cols-2">
      <Link to={productUrl(p)} className={`block bg-white ${reverse ? 'md:order-2' : ''}`} tabIndex={-1} aria-hidden="true">
        <Img src={p.images[0]} alt="" className="aspect-[4/3] h-full w-full" sizesAttr="(min-width:768px) 45vw, 100vw" />
      </Link>
      <div className="flex flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {save > 0 && <Badge tone="lime">Save {ghs(save)} ({Math.round((save / worth) * 100)}%)</Badge>}
          {p.badge && <Badge tone="aqua">{p.badge}</Badge>}
        </div>
        <h2 className="mt-3 text-3xl">
          <Link to={productUrl(p)} className="hover:text-primary">
            {p.name}
          </Link>
        </h2>
        <p className="mt-2 text-muted">{p.description}</p>
        <ul className="mt-4 space-y-1.5">
          {p.includes.map((it) => {
            const ip = getProduct(it.productId)
            const iv = getVariant(ip, it.variantId)
            return (
              <li key={it.variantId} className="flex items-start gap-2 text-sm">
                <LuCheck className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {it.qty} × {ip.name} <span className="text-muted">({variantLabel(iv)})</span>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <p className="text-sm text-muted">
              Worth <s>{ghs(worth)}</s>
            </p>
            <p className="font-heading text-3xl text-primary">{ghs(v.price)}</p>
          </div>
          <button type="button" onClick={() => add(p.id, v.id)} className="btn btn-primary">
            <LuShoppingBag aria-hidden="true" /> Add to Cart<span className="sr-only">: {p.name}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Bundles() {
  useSeo({ title: 'Bundles & Starter Packs', description: 'Save on Evafresh starter kits and bundles. Everything you need for a clean home, for less than buying separately.' })
  const starters = inCollection('starter-packs').filter((p) => !p.collections.includes('business-packs'))
  const business = inCollection('business-packs')
  const bundles = inCollection('bundles')
  return (
    <>
      <PageHero eyebrow="Bundles & Save" title="Starter Packs & Bundles" intro="Get everything you need in one order and pay less than buying each product separately. Savings are shown on every kit." tone="aqua" />
      <section className="container-x py-12 md:py-16" aria-labelledby="starter-title">
        <h2 id="starter-title" className="mb-6 text-3xl">
          Home starter packs
        </h2>
        <div className="flex flex-col gap-6">
          {starters.map((p, i) => (
            <BundleRow key={p.id} p={p} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>
      <section className="bg-aqua-soft py-12 md:py-16" aria-labelledby="business-title">
        <div className="container-x">
          <h2 id="business-title" className="text-3xl">
            Business starter packs
          </h2>
          <p className="mb-6 mt-2 max-w-2xl text-muted">For hotels, hospitals and clinics, wholesalers and distributors. Bulk sizes at business prices, with invoices and scheduled delivery available.</p>
          <div className="flex flex-col gap-6">
            {business.map((p, i) => (
              <BundleRow key={p.id} p={p} reverse={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>
      <section className="bg-sand py-12 md:py-16" aria-labelledby="bundles-title">
        <div className="container-x">
          <h2 id="bundles-title" className="mb-6 text-3xl">
            Stock-up bundles
          </h2>
          <div className="flex flex-col gap-6">
            {bundles.map((p, i) => (
              <BundleRow key={p.id} p={p} reverse={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>
      <section className="container-x py-12 text-center">
        <h2 className="text-3xl">Want a custom bundle?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">Choose your own products and scents for a home, office, school or gift. Larger orders get wholesale prices.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/wholesale" className="btn btn-primary">
            Request a bulk quote
          </Link>
          <Link to="/shop" className="btn btn-outline">
            Shop all products
          </Link>
        </div>
      </section>
    </>
  )
}
