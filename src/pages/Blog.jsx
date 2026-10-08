import { useState } from 'react'
import data from '../data/articles.json'
import site from '../data/site.json'
import { formatDate } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import Img, { photoUrl } from '../lib/Img.jsx'
import { Breadcrumbs, PageHero } from '../components/ui.jsx'
import NotFound from './NotFound.jsx'

export function ArticleCard({ a, headingLevel = 2 }) {
  const H = `h${headingLevel}`
  return (
    <article className="card group flex h-full flex-col overflow-hidden">
      <Link to={`/tips/${a.slug}`} tabIndex={-1} aria-hidden="true" className="block overflow-hidden">
        <Img src={a.image} alt="" className="aspect-[3/2] w-full bg-white transition duration-500 group-hover:scale-105" fit="cover" sizesAttr="(min-width:1024px) 33vw, 100vw" />
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow">{a.category}</p>
        <H className="mt-2 text-xl">
          <Link to={`/tips/${a.slug}`} className="hover:text-primary">
            {a.title}
          </Link>
        </H>
        <p className="mt-2 flex-1 text-muted">{a.excerpt}</p>
        <p className="mt-4 text-sm text-muted">
          <time dateTime={a.date}>{formatDate(a.date)}</time> · {a.readMinutes} min read
        </p>
      </div>
    </article>
  )
}

export function Blog() {
  useSeo({ title: 'Cleaning Tips & Blog', description: 'Practical cleaning tips for Ghanaian homes: palm-oil stains, white uniforms, harmattan dust, bathrooms and more.' })
  const [cat, setCat] = useState('All')
  const list = data.articles.filter((a) => cat === 'All' || a.category === cat)
  return (
    <>
      <PageHero eyebrow="Learn" title="Cleaning Tips & Tricks" intro="Simple, practical guides for a cleaner Ghanaian home." />
      <section className="container-x py-12">
        <div role="group" aria-label="Filter articles by category" className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
          {['All', ...data.categories].map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c ? 'bg-primary text-white' : 'bg-white hover:bg-aqua-soft'}`}>
              {c}
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {list.length} articles
        </p>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <li key={a.slug}>
              <ArticleCard a={a} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export function Article({ params }) {
  const a = data.articles.find((x) => x.slug === params.slug)
  useSeo(
    a
      ? {
          title: a.title,
          description: a.excerpt,
          image: photoUrl(a.image),
          type: 'article',
          jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.date, image: `${site.siteUrl}${photoUrl(a.image)}`, author: { '@type': 'Organization', name: site.legalName }, publisher: { '@type': 'Organization', name: site.legalName } },
        }
      : { title: 'Article not found', noindex: true },
  )
  if (!a) return <NotFound />
  const related = data.articles.filter((x) => x.slug !== a.slug).slice(0, 3)
  return (
    <>
      <article className="container-x max-w-3xl pb-12">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Tips', to: '/tips' }, { label: a.title }]} />
        <p className="eyebrow">{a.category}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{a.title}</h1>
        <p className="mt-3 text-muted">
          <time dateTime={a.date}>{formatDate(a.date)}</time> · {a.readMinutes} min read
        </p>
        <Img src={a.image} alt="" className="mt-8 aspect-[3/2] w-full rounded-card bg-white" fit="cover" priority sizesAttr="(min-width:768px) 768px, 100vw" />
        <div className="prose-evc mt-8 text-lg">
          {a.body.map((b, i) =>
            b.h ? (
              <h2 key={i}>{b.h}</h2>
            ) : b.list ? (
              <ul key={i}>
                {b.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.p}</p>
            ),
          )}
        </div>
        <div className="mt-10 rounded-card bg-aqua-soft p-6">
          <p className="font-heading text-xl">Need the right products?</p>
          <p className="mt-1 text-muted">Shop the Evafresh range, delivered across Ghana.</p>
          <Link to="/shop" className="btn btn-primary mt-4">
            Shop now
          </Link>
        </div>
      </article>
      <section className="bg-sand py-12" aria-labelledby="related-title">
        <div className="container-x">
          <h2 id="related-title" className="mb-6 text-3xl">
            More tips
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <ArticleCard a={r} headingLevel={3} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
