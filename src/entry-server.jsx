// Used only at build time to pre-render every page to static HTML (better SEO + faster first load).
import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { seoToHtml } from './lib/seo.jsx'
import { products, collections } from './lib/catalog.js'
import articleData from './data/articles.json'

export function render(url) {
  const collector = {}
  const html = renderToString(<App url={url} seoCollector={collector} />)
  return { html, head: seoToHtml(collector.seo) }
}

export function allRoutes() {
  const statics = [
    '/', '/shop', '/bundles', '/checkout', '/how-it-works', '/our-story', '/tips', '/help', '/stockists', '/contact',
    '/wholesale', '/rewards', '/refer', '/account', '/account/login', '/account/register', '/account/reset', '/account/invoice', '/account/receipt', '/account/statement', '/admin', '/privacy', '/terms', '/order-confirmed',
  ]
  return [
    ...statics,
    ...collections.filter((c) => c.slug !== 'shop-all').map((c) => `/collections/${c.slug}`),
    ...products.map((p) => `/products/${p.id}`),
    ...articleData.articles.map((a) => `/tips/${a.slug}`),
  ]
}
