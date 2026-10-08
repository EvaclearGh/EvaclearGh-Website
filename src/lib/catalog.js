// Reads the JSON data files and adds helpful calculated values.
import productData from '../data/products.json'
import collectionData from '../data/collections.json'
import reviewData from '../data/reviews.json'

const byId = new Map()
for (const p of productData.products) byId.set(p.id, p)

export const reviews = reviewData.reviews
export const collections = collectionData.collections

export function getProduct(id) {
  return byId.get(id) || null
}

export function getVariant(product, variantId) {
  return product?.variants.find((v) => v.id === variantId) || product?.variants[0] || null
}

/** For bundles: total of the items if bought separately */
export function bundleWorth(product) {
  if (!product.includes) return null
  return product.includes.reduce((sum, item) => {
    const p = getProduct(item.productId)
    const v = getVariant(p, item.variantId)
    return sum + (v ? v.price * item.qty : 0)
  }, 0)
}

/** compare-at price shown crossed out: explicit compareAt, or bundle worth */
export function compareAtFor(product, variant) {
  if (variant?.compareAt && variant.compareAt > variant.price) return variant.compareAt
  if (product.type === 'bundle') {
    const worth = bundleWorth(product)
    if (worth > variant.price) return worth
  }
  return null
}

export function minPrice(product) {
  return Math.min(...product.variants.map((v) => v.price))
}

export function reviewSummary(productId) {
  const list = reviews.filter((r) => r.productId === productId)
  if (!list.length) return { count: 0, average: 0, list }
  const average = list.reduce((s, r) => s + r.rating, 0) / list.length
  return { count: list.length, average: Math.round(average * 10) / 10, list }
}

const enrich = (p) => ({
  ...p,
  minPrice: minPrice(p),
  sizes: [...new Set(p.variants.map((v) => v.size))],
})

export const products = productData.products.map(enrich)

export function getCollection(slug) {
  return collections.find((c) => c.slug === slug) || null
}

export function productsFor(collection) {
  const m = collection?.match || {}
  if (m.all) return products
  return products.filter(
    (p) =>
      (m.category && (p.category === m.category || (p.alsoIn || []).includes(m.category))) ||
      (m.collection && p.collections.includes(m.collection)) ||
      (m.type && p.type === m.type),
  )
}

export function inCollection(slug) {
  return productsFor(getCollection(slug))
}

export const categoryCollections = collections.filter((c) => c.isCategory)

/** Lowest kit price, used for the hero "Starting at" badge */
export function startingKitPrice() {
  const kits = inCollection('starter-packs')
  return kits.length ? Math.min(...kits.map((k) => k.minPrice)) : Math.min(...products.map((p) => p.minPrice))
}

export function searchProducts(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const words = q.split(/\s+/)
  return products
    .map((p) => {
      const hay = `${p.name} ${p.tagline} ${p.shortDescription} ${p.category} ${(p.usedFor || []).join(' ')} ${p.variants
        .map((v) => `${v.size} ${v.scent || ''}`)
        .join(' ')}`.toLowerCase()
      const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0) + (p.name.toLowerCase().includes(w) ? 2 : 0), 0)
      return { p, score }
    })
    .filter((x) => x.score >= words.length)
    .sort((a, b) => b.score - a.score || a.p.popularity - b.p.popularity)
    .map((x) => x.p)
}

export function crossSellFor(product, limit = 4) {
  return (product.crossSell || []).map(getProduct).filter(Boolean).slice(0, limit).map(enrich)
}

export function productUrl(p) {
  return `/products/${p.id}`
}
