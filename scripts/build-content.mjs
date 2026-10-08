// Turns the content edited in the website editor (/cms) into the data files the site is built from.
//   content/products/*.json  → src/data/products.json
//   content/articles/*.json  → src/data/articles.json   (article text is written in Markdown)
// Runs automatically before `npm run dev` and `npm run build`. Don't edit the two generated files by hand.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readDir = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
          } catch (e) {
            throw new Error(`Could not read ${path.join(dir, f)}: ${e.message}`)
          }
        })
    : []

const write = (file, data) => {
  const out = `${JSON.stringify(data, null, 2)}\n`
  const full = path.join(root, file)
  if (!fs.existsSync(full) || fs.readFileSync(full, 'utf8') !== out) fs.writeFileSync(full, out)
}

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')

// ── Products ────────────────────────────────────────────────────────────
const problems = []
const products = readDir(path.join(root, 'content/products'))
  .filter((p) => p && p.id && p.published !== false)
  .map((p) => {
    const { order, published, ...rest } = p
    // Tidy values the editor may leave empty
    rest.variants = (rest.variants || []).map((v, i) => ({ ...v, id: v.id || `${rest.id}-${slugify(`${v.scent || ''} ${v.size || ''}`) || i + 1}`, price: Number(v.price) || 0 }))
    for (const k of ['collections', 'images', 'usedFor', 'benefits', 'howToUse', 'dilution', 'faqs', 'crossSell']) rest[k] = rest[k] || []
    for (const k of ['ingredients', 'safety', 'badge', 'tagline', 'shortDescription', 'description']) rest[k] = rest[k] ?? ''
    if (!rest.variants.length) problems.push(`Product "${rest.name}" has no sizes/prices, so it can't be bought.`)
    return { _order: Number(order) || 0, ...rest }
  })
  .sort((a, b) => a._order - b._order || a.name.localeCompare(b.name))
  .map(({ _order, ...p }) => p)

const ids = new Set()
for (const p of products) {
  if (ids.has(p.id)) problems.push(`Two products use the same ID "${p.id}". Give one of them a different ID.`)
  ids.add(p.id)
}
for (const p of products) {
  for (const inc of p.includes || []) if (!ids.has(inc.productId)) problems.push(`Bundle "${p.name}" includes a product that doesn't exist: "${inc.productId}".`)
  p.crossSell = p.crossSell.filter((id) => ids.has(id))
}

write('src/data/products.json', {
  _note: 'GENERATED from content/products by scripts/build-content.mjs. Edit products in the website editor (/cms) or in content/products/, not here.',
  products,
})

// ── Articles (Markdown → blocks the blog page renders) ──────────────────
function markdownToBlocks(md) {
  if (Array.isArray(md)) return md
  const blocks = []
  const clean = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\[(.+?)\]\((.+?)\)/g, '$1').trim()
  for (const chunk of String(md || '').replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim())
    if (!lines.length) continue
    if (lines.every((l) => /^\s*([-*+]|\d+[.)])\s+/.test(l))) {
      blocks.push({ list: lines.map((l) => clean(l.replace(/^\s*([-*+]|\d+[.)])\s+/, ''))) })
    } else if (/^#{1,6}\s/.test(lines[0])) {
      blocks.push({ h: clean(lines[0].replace(/^#{1,6}\s+/, '')) })
      if (lines.length > 1) blocks.push({ p: clean(lines.slice(1).join(' ')) })
    } else {
      blocks.push({ p: clean(lines.join(' ')) })
    }
  }
  return blocks
}

const CATEGORY_ORDER = ['Kitchen', 'Laundry', 'Bathroom', 'Home Care', 'Refill Living']
const articles = readDir(path.join(root, 'content/articles'))
  .filter((a) => a && a.slug && a.published !== false)
  .map(({ published, ...a }) => {
    const body = markdownToBlocks(a.body)
    const words = body.map((b) => b.h || b.p || (b.list || []).join(' ')).join(' ').split(/\s+/).length
    return { ...a, body, readMinutes: Number(a.readMinutes) || Math.max(1, Math.round(words / 200)) }
  })
  .sort((a, b) => String(b.date).localeCompare(String(a.date)))
const used = [...new Set(articles.map((a) => a.category).filter(Boolean))]
const categories = [...CATEGORY_ORDER.filter((c) => used.includes(c)), ...used.filter((c) => !CATEGORY_ORDER.includes(c))]

write('src/data/articles.json', {
  _note: 'GENERATED from content/articles by scripts/build-content.mjs. Edit articles in the website editor (/cms) or in content/articles/, not here.',
  categories,
  articles,
})

if (problems.length) {
  console.warn(`\n⚠  Content needs attention:\n - ${problems.join('\n - ')}\n`)
  if (problems.some((p) => p.startsWith('Two products'))) process.exit(1)
}
console.log(`Content ready: ${products.length} products, ${articles.length} articles`)
