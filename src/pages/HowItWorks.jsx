import { LuTriangleAlert } from 'react-icons/lu'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import Img from '../lib/Img.jsx'
import { PageHero } from '../components/ui.jsx'

// Simple inline diagrams (SVG) for each step — edit or replace with photos/video
const Diagram = {
  buy: (
    <svg viewBox="0 0 220 160" className="h-auto w-full" aria-hidden="true">
      <rect x="10" y="20" width="200" height="130" rx="18" fill="var(--evc-aqua-soft)" />
      <path d="M60 70h100l-10 60H70z" fill="#fff" stroke="var(--evc-primary)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M85 70c0-18 10-28 25-28s25 10 25 28" fill="none" stroke="var(--evc-primary)" strokeWidth="4" />
      <rect x="92" y="84" width="16" height="34" rx="4" fill="var(--evc-lime)" />
      <rect x="112" y="78" width="20" height="40" rx="5" fill="var(--evc-aqua)" />
    </svg>
  ),
  use: (
    <svg viewBox="0 0 220 160" className="h-auto w-full" aria-hidden="true">
      <rect x="10" y="20" width="200" height="130" rx="18" fill="var(--evc-aqua-soft)" />
      <path d="M70 60h40v14l8 6v50H62V80l8-6z" fill="#fff" stroke="var(--evc-primary)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="78" y="44" width="24" height="16" rx="3" fill="var(--evc-primary)" />
      <path d="M130 90h50l-6 40h-38z" fill="var(--evc-aqua)" stroke="var(--evc-primary)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M118 80q10-14 22 0" fill="none" stroke="var(--evc-primary)" strokeWidth="3" strokeDasharray="4 4" />
      <circle cx="150" cy="80" r="4" fill="var(--evc-primary)" />
      <circle cx="160" cy="72" r="3" fill="var(--evc-primary)" />
    </svg>
  ),
  refill: (
    <svg viewBox="0 0 220 160" className="h-auto w-full" aria-hidden="true">
      <rect x="10" y="20" width="200" height="130" rx="18" fill="var(--evc-aqua-soft)" />
      <path d="M40 60h60v70H40z" fill="#fff" stroke="var(--evc-primary)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 46h24v14H58z" fill="var(--evc-primary)" />
      <rect x="48" y="80" width="44" height="40" rx="6" fill="var(--evc-lime)" />
      <path d="M110 92c14 0 20-12 34-12" fill="none" stroke="var(--evc-primary)" strokeWidth="4" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 10 5 0 10z" fill="var(--evc-primary)" />
        </marker>
      </defs>
      <path d="M150 70h30v8l5 5v47h-40V83l5-5z" fill="#fff" stroke="var(--evc-primary)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="152" y="100" width="26" height="26" rx="4" fill="var(--evc-aqua)" />
    </svg>
  ),
}

const STEPS = [
  { key: 'buy', title: 'Buy', text: 'Start with a starter kit or the products you need. Choose everyday sizes (1L, 750ml) for your bottles, and big sizes (5L, 25L) to save.' },
  { key: 'use', title: 'Dilute & use', text: 'Follow the dilution guide on each product page and label. Many jobs need only a capful in a bucket of water, so every bottle goes further.' },
  { key: 'refill', title: 'Refill', text: 'When your bottle runs low, top it up from your 5L or 25L jug. You pay less per litre and throw away fewer bottles.' },
]

export default function HowItWorks() {
  useSeo({ title: 'How It Works', description: 'Buy, dilute and refill: how to get the most from Evafresh cleaning products and save money with big refill sizes.' })
  return (
    <>
      <PageHero eyebrow="How it works" title="Buy. Use. Refill." intro="Three simple steps to a cleaner home and a lower cleaning bill." tone="aqua" />
      <section className="container-x py-12 md:py-16">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.key} className="card flex flex-col p-6">
              <div className="overflow-hidden rounded-2xl">{Diagram[s.key]}</div>
              <p className="mt-5 grid h-10 w-10 place-items-center rounded-full bg-primary font-heading text-lg text-white" aria-hidden="true">
                {i + 1}
              </p>
              <h2 className="mt-3 text-2xl">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h2>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-sand py-12 md:py-16">
        <div className="container-x grid items-center gap-8 lg:grid-cols-2">
          <Img src="real-jugs-row" alt="Evafresh 5L jugs of fabric softener, floor cleaner, stain remover and liquid soap" className="aspect-[3/2] w-full rounded-card bg-white" fit="cover" />
          <div>
            <h2 className="text-3xl sm:text-4xl">Refilling, step by step</h2>
            <ol className="mt-5 list-decimal space-y-2 pl-5">
              <li>Use up the product in your bottle and rinse it with clean water.</li>
              <li>Refill only with the <strong>same product</strong> it originally contained.</li>
              <li>Pour slowly from your jug, or use a pump dispenser for no spills.</li>
              <li>Close both tightly and keep the label on the bottle.</li>
              <li>Store out of direct sunlight and out of reach of children.</li>
            </ol>
            <p className="mt-6 flex gap-3 rounded-2xl bg-white p-4 text-sm">
              <LuTriangleAlert className="mt-0.5 shrink-0 text-danger" size={20} aria-hidden="true" />
              <span>
                <strong>Never mix products</strong> (for example bleach with stain remover). Never put cleaning products in drink bottles.
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/collections/refills" className="btn btn-primary">
                Shop refills
              </Link>
              <Link to="/collections/starter-packs" className="btn btn-outline">
                Shop starter kits
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-12 md:py-16">
        <h2 className="text-3xl">Video guides</h2>
        <p className="mt-2 text-muted">Add short how-to videos here (for example from TikTok, Instagram or YouTube).</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {['How to dilute liquid soap', 'Refilling from a 25L jerrycan', 'Using stain remover safely'].map((t) => (
            <div key={t} className="card grid aspect-video place-items-center bg-aqua-soft p-6 text-center">
              <div>
                <p className="font-heading text-xl">{t}</p>
                <p className="mt-2 text-sm text-muted">Video placeholder — paste your embed code in src/pages/HowItWorks.jsx</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
