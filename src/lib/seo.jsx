/*
 * Per-page <title>, meta description, Open Graph tags, canonical URL and JSON-LD.
 * In the browser it updates <head>; during pre-rendering it collects the tags
 * so they are written into the static HTML for search engines and link previews.
 */
import { createContext, useContext, useEffect } from 'react'
import site from '../data/site.json'
import { useRouter } from './router.jsx'

const SeoCtx = createContext(null)

export function SeoProvider({ collector, children }) {
  return <SeoCtx.Provider value={collector || null}>{children}</SeoCtx.Provider>
}

function absolute(url) {
  if (!url) return `${site.siteUrl}/og-image.jpg`
  if (/^https?:/.test(url)) return url
  return `${site.siteUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

export function buildSeo({ title, description, image, type = 'website', path = '/', jsonLd, noindex }) {
  const fullTitle = title ? `${title} | ${site.name}` : `${site.name} | ${site.tagline}`
  const desc = description || site.defaultDescription
  const url = `${site.siteUrl}${path === '/' ? '' : path}`
  const meta = [
    ['name', 'description', desc],
    ['property', 'og:title', fullTitle],
    ['property', 'og:description', desc],
    ['property', 'og:type', type],
    ['property', 'og:url', url],
    ['property', 'og:image', absolute(image)],
    ['property', 'og:site_name', site.name],
    ['property', 'og:locale', 'en_GH'],
    ['name', 'twitter:card', 'summary_large_image'],
  ]
  if (noindex) meta.push(['name', 'robots', 'noindex'])
  return { title: fullTitle, meta, canonical: url, jsonLd: jsonLd ? [].concat(jsonLd) : [] }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function seoToHtml(seo) {
  if (!seo) return ''
  const tags = [`<title>${esc(seo.title)}</title>`]
  for (const [attr, key, content] of seo.meta) tags.push(`<meta ${attr}="${key}" content="${esc(content)}" data-seo />`)
  tags.push(`<link rel="canonical" href="${esc(seo.canonical)}" data-seo />`)
  for (const ld of seo.jsonLd) tags.push(`<script type="application/ld+json" data-seo>${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`)
  return tags.join('\n    ')
}

export function useSeo(opts) {
  const collector = useContext(SeoCtx)
  const { pathname } = useRouter()
  const seo = buildSeo({ path: pathname, ...opts })
  if (collector) collector.seo = seo // server-side: remember for the static HTML

  const key = JSON.stringify(seo)
  useEffect(() => {
    document.title = seo.title
    document.querySelectorAll('[data-seo]').forEach((n) => n.remove())
    // remove default (non-managed) description so there is only one
    document.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
    for (const [attr, k, content] of seo.meta) {
      const m = document.createElement('meta')
      m.setAttribute(attr, k)
      m.setAttribute('content', content)
      m.setAttribute('data-seo', '')
      document.head.appendChild(m)
    }
    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = seo.canonical
    link.setAttribute('data-seo', '')
    document.head.appendChild(link)
    for (const ld of seo.jsonLd) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.setAttribute('data-seo', '')
      s.textContent = JSON.stringify(ld)
      document.head.appendChild(s)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
