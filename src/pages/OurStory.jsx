import { LuHandshake, LuHeart, LuMapPin, LuShieldCheck } from 'react-icons/lu'
import site from '../data/site.json'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import Img, { asset } from '../lib/Img.jsx'
import { PageHero, SampleTag } from '../components/ui.jsx'

// EDIT ME: replace the placeholder text below with your own story, mission, values and team.
const VALUES = [
  { Icon: LuShieldCheck, title: 'Quality you can trust', text: 'Every batch is checked so it cleans the way you expect, every time.' },
  { Icon: LuHeart, title: 'Fair prices for families', text: 'Big sizes and refills so a clean home doesn’t cost too much.' },
  { Icon: LuHandshake, title: 'Honest service', text: 'Clear labels, clear prices and real people on WhatsApp.' },
  { Icon: LuMapPin, title: 'Rooted in Ghana', text: 'Built in Kumasi, for Ghanaian homes and businesses.' },
]
const TEAM = [
  { name: '[Founder name]', role: 'Founder & Managing Director', image: '/images/avatars/avatar-1.svg' },
  { name: '[Name]', role: 'Production & Quality', image: '/images/avatars/avatar-2.svg' },
  { name: '[Name]', role: 'Sales & Customer Care', image: '/images/avatars/avatar-3.svg' },
  { name: '[Name]', role: 'Deliveries & Logistics', image: '/images/avatars/avatar-4.svg' },
]

export default function OurStory() {
  useSeo({ title: 'Our Story', description: `About ${site.legalName}: our mission, values and the team behind Evafresh cleaning products in ${site.address.city}, Ghana.` })
  return (
    <>
      <PageHero eyebrow="Our story" title="Clean homes. Safe families." intro={`${site.legalName} is a ${site.address.city}-based business behind the Evafresh range of home cleaning products.`}>
        <div className="mt-4">
          <SampleTag>Placeholder text — edit in src/pages/OurStory.jsx</SampleTag>
        </div>
      </PageHero>

      <section className="container-x grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2">
        <Img src="real-products-table" alt="Evafresh liquid soap, multi-surface cleaner and fabric softener" className="aspect-[3/2] w-full rounded-card" fit="cover" />
        <div className="prose-evc">
          <h2 className="text-3xl sm:text-4xl">How we started</h2>
          <p>[Tell your story here. When did Evaclear begin? What problem did you see in Ghanaian homes, markets or businesses? Who started it and why?]</p>
          <p>Example: We started Evaclear because we believed every family should be able to afford good cleaning products, and buy them in sizes that make sense, from a single litre to a 25-litre jerrycan.</p>
          <p>Today the Evafresh range covers liquid soap, floor cleaner, bleach, stain remover, fabric softener, glass and multi-surface cleaners, body & hand wash, and more.</p>
        </div>
      </section>

      <section className="on-dark bg-primary py-12 text-white md:py-16">
        <div className="container-x text-center">
          <p className="eyebrow !text-lime">Our mission</p>
          <p className="mx-auto mt-4 max-w-3xl font-heading text-2xl leading-snug sm:text-4xl">“To make quality home cleaning affordable, simple and refillable for every Ghanaian home.”</p>
        </div>
      </section>

      <section className="container-x py-12 md:py-16" aria-labelledby="values-title">
        <h2 id="values-title" className="text-center text-3xl sm:text-4xl">
          What we stand for
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ Icon, title, text }) => (
            <li key={title} className="card p-6">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-aqua-soft text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-body text-lg font-bold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-sand py-12 md:py-16" aria-labelledby="team-title">
        <div className="container-x">
          <h2 id="team-title" className="text-center text-3xl sm:text-4xl">
            Meet the team
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {TEAM.map((t, i) => (
              <li key={i} className="card p-5 text-center">
                <img src={asset(t.image)} alt="" width="120" height="120" loading="lazy" className="mx-auto h-24 w-24 rounded-full sm:h-28 sm:w-28" />
                <h3 className="mt-4 font-body font-bold">{t.name}</h3>
                <p className="text-sm text-muted">{t.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x py-12 text-center md:py-16">
        <h2 className="text-3xl">Ready to try Evafresh?</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/collections/starter-packs" className="btn btn-primary">
            Shop starter kits
          </Link>
          <Link to="/contact" className="btn btn-outline">
            Contact us
          </Link>
        </div>
      </section>
    </>
  )
}
