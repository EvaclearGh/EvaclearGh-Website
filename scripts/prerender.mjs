// Writes a static HTML file for every page + sitemap.xml (runs after `vite build`).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const dist = path.join(root, 'dist')
const serverEntry = pathToFileURL(path.join(root, 'dist-server', 'entry-server.js')).href
const { render, allRoutes } = await import(serverEntry)
const site = JSON.parse(fs.readFileSync(path.join(root, 'src/data/site.json'), 'utf8'))

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const noIndex = new Set(['/checkout', '/order-confirmed', '/account', '/account/login', '/account/register', '/account/reset', '/account/invoice', '/account/receipt', '/account/statement', '/admin'])
const routes = allRoutes()

for (const url of routes) {
  const { html, head } = render(url)
  const page = template
    .replace(/<!--default-head-->[\s\S]*?<!--\/default-head-->/, '')
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', html)
  const out = url === '/' ? path.join(dist, 'index.html') : path.join(dist, url, 'index.html')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, page)
}

// 404 page for hosts that support it (Netlify, Vercel, Cloudflare Pages)
const nf = render('/__not-found__')
fs.writeFileSync(
  path.join(dist, '404.html'),
  template.replace(/<!--default-head-->[\s\S]*?<!--\/default-head-->/, '').replace('<!--app-head-->', nf.head).replace('<!--app-html-->', nf.html),
)

const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .filter((r) => !noIndex.has(r))
  .map((r) => `  <url><loc>${site.siteUrl}${r === '/' ? '' : r}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')}
</urlset>
`
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap)
fs.rmSync(path.join(root, 'dist-server'), { recursive: true, force: true })
console.log(`Pre-rendered ${routes.length} pages + 404.html + sitemap.xml`)
