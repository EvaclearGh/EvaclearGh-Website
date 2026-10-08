import { useId, useState } from 'react'
import { LuShoppingBag } from 'react-icons/lu'
import Img from '../lib/Img.jsx'
import { Link } from '../lib/router.jsx'
import { compareAtFor, productUrl, reviewSummary } from '../lib/catalog.js'
import { useCart, variantLabel } from '../context/CartContext.jsx'
import { Badge, Price, Stars } from './ui.jsx'

const badgeTone = { 'Best Seller': 'lime', 'Most Loved': 'aqua', New: 'teal' }

export default function ProductCard({ product, headingLevel = 3 }) {
  const { add } = useCart()
  const [variantId, setVariantId] = useState(product.variants[0].id)
  const variant = product.variants.find((v) => v.id === variantId)
  const compareAt = compareAtFor(product, variant)
  const { count, average } = reviewSummary(product.id)
  const selectId = useId()
  const H = `h${headingLevel}`
  const image = variant.image || product.images[0]

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link to={productUrl(product)} className="relative block aspect-[4/3] overflow-hidden bg-white" tabIndex={-1} aria-hidden="true">
        <Img src={image} alt="" className="h-full w-full transition duration-500 group-hover:scale-105" sizesAttr="(min-width:1024px) 25vw, (min-width:640px) 45vw, 80vw" />
        {product.badge && (
          <span className="absolute left-3 top-3">
            <Badge tone={badgeTone[product.badge] || 'lime'}>{product.badge}</Badge>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{product.tagline}</p>
        <H className="text-lg leading-snug">
          <Link to={productUrl(product)} className="hover:text-primary">
            {product.name}
          </Link>
        </H>
        {count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Stars rating={average} size={14} /> <span>({count})</span>
          </div>
        )}
        <p className="text-sm text-muted">{product.shortDescription}</p>
        <div className="mt-auto flex flex-col gap-3 pt-2">
          {product.variants.length > 1 ? (
            <div>
              <label htmlFor={selectId} className="sr-only">
                Choose option for {product.name}
              </label>
              <select id={selectId} value={variantId} onChange={(e) => setVariantId(e.target.value)} className="field min-h-10 py-1.5 text-sm">
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {variantLabel(v)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted">{variantLabel(variant)}</p>
          )}
          <Price price={variant.price} compareAt={compareAt} />
          <button type="button" onClick={() => add(product.id, variantId)} className="btn btn-primary w-full">
            <LuShoppingBag aria-hidden="true" /> Add to Cart
            <span className="sr-only">: {product.name}, {variantLabel(variant)}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
