// Rewards, Refer a Friend, Account, Privacy Policy, Terms
import { useState } from 'react'
import { LuCopy, LuGift, LuPackage, LuShoppingBag, LuStar, LuUsers } from 'react-icons/lu'
import site from '../data/site.json'
import { FREE_THRESHOLD, HOME_AREA } from '../lib/delivery.js'
import { ghs } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { waLink } from '../lib/whatsapp.js'
import { PageHero, SampleTag } from '../components/ui.jsx'

/* ── Loyalty Rewards (information page — no backend needed) ─────────────── */
export function Rewards() {
  useSeo({ title: 'Loyalty Rewards', description: 'Earn points on every Evafresh order and turn them into discounts.' })
  const tiers = [
    { name: 'Fresh', need: 'From your first order', perks: ['1 point per GH₵1 spent', 'Birthday treat'] },
    { name: 'Sparkle', need: `Spend ${ghs(1000)} in a year`, perks: ['1.25 points per GH₵1', 'Early access to new scents'] },
    { name: 'Spotless', need: `Spend ${ghs(3000)} in a year`, perks: ['1.5 points per GH₵1', `Free ${HOME_AREA} delivery on every order`] },
  ]
  return (
    <>
      <PageHero eyebrow="Rewards" title="Clean more. Earn more." intro="Collect points every time you shop and turn them into money off your next order." tone="aqua">
        <div className="mt-4">
          <SampleTag>Sample programme — set your own rules</SampleTag>
        </div>
      </PageHero>
      <section className="container-x py-12">
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            { Icon: LuShoppingBag, t: 'Shop', d: 'Order online or on WhatsApp using the same phone number.' },
            { Icon: LuStar, t: 'Earn points', d: 'Get 1 point for every GH₵1 you spend. We track them by phone number.' },
            { Icon: LuGift, t: 'Redeem', d: `Every 500 points = ${ghs(25)} off. Just ask when you order.` },
          ].map(({ Icon, t, d }, i) => (
            <li key={t} className="card p-6">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-lime">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-2xl">
                {i + 1}. {t}
              </h2>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <h2 className="mt-14 text-center text-3xl">Membership levels</h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {tiers.map((t, i) => (
            <li key={t.name} className={`card p-6 ${i === 2 ? 'on-dark bg-primary text-white' : ''}`}>
              <p className="font-heading text-2xl">{t.name}</p>
              <p className={i === 2 ? 'text-white/80' : 'text-muted'}>{t.need}</p>
              <ul className="mt-4 space-y-1">
                {t.perks.map((p) => (
                  <li key={p}>✓ {p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <a href={waLink('Hello Evaclear! How many reward points do I have?')} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Check my points on WhatsApp
          </a>
        </div>
      </section>
    </>
  )
}

/* ── Refer a Friend ────────────────────────────────────────────────────── */
export function Refer() {
  useSeo({ title: 'Refer a Friend', description: `Give your friends ${ghs(20)} off their first Evafresh order and get ${ghs(20)} off yours.` })
  const [copied, setCopied] = useState(false)
  const shareText = `I clean with Evafresh from ${site.name}! Use my name when you order on WhatsApp and get ${ghs(20)} off your first order: ${site.siteUrl}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* ignore */
    }
  }
  return (
    <>
      <PageHero eyebrow="Refer a friend" title={`Give ${ghs(20)}, get ${ghs(20)}`} intro="Share Evafresh with friends and family. When they place their first order, you both save.">
        <div className="mt-4">
          <SampleTag>Sample offer — set your own amounts</SampleTag>
        </div>
      </PageHero>
      <section className="container-x max-w-3xl py-12">
        <ol className="space-y-4">
          {['Share the message below with friends on WhatsApp or social media.', `Your friend mentions your name or phone number on their first order (minimum ${ghs(100)}).`, `They get ${ghs(20)} off, and you get ${ghs(20)} off your next order.`].map((t, i) => (
            <li key={i} className="card flex items-start gap-4 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-heading text-white">{i + 1}</span>
              <span className="pt-2">{t}</span>
            </li>
          ))}
        </ol>
        <div className="card mt-8 p-6">
          <p className="label">Your share message</p>
          <p className="rounded-xl bg-sand p-4">{shareText}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
              <LuUsers aria-hidden="true" /> Share on WhatsApp
            </a>
            <button type="button" onClick={copy} className="btn btn-outline">
              <LuCopy aria-hidden="true" /> {copied ? 'Copied!' : 'Copy message'}
            </button>
          </div>
          <p className="sr-only" role="status">
            {copied ? 'Message copied' : ''}
          </p>
        </div>
      </section>
    </>
  )
}

/* ── Account (simple — no login system yet) ────────────────────────────── */
export function AccountOffline() {
  useSeo({ title: 'My Account', noindex: true })
  return (
    <>
      <PageHero eyebrow="My account" title="Track orders & rewards" intro="We don’t use passwords yet: everything is linked to your phone number." />
      <section className="container-x grid gap-6 py-12 md:grid-cols-3">
        {[
          { Icon: LuPackage, t: 'Track my order', d: 'Send us your order reference (e.g. EVC-260101-ABCDE) and we’ll update you.', href: waLink('Hello Evaclear! I’d like to track my order. My reference is: '), cta: 'Track on WhatsApp' },
          { Icon: LuStar, t: 'My reward points', d: 'Check your points balance and redeem them on your next order.', href: waLink('Hello Evaclear! How many reward points do I have?'), cta: 'Check points' },
          { Icon: LuShoppingBag, t: 'Reorder', d: 'Want the same as last time? Tell us your phone number and we’ll repeat your last order.', href: waLink('Hello Evaclear! Please repeat my last order.'), cta: 'Reorder on WhatsApp' },
        ].map(({ Icon, t, d, href, cta }) => (
          <div key={t} className="card flex flex-col p-6">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-aqua-soft text-primary">
              <Icon size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-2xl">{t}</h2>
            <p className="mt-1 flex-1 text-muted">{d}</p>
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-5 self-start">
              {cta}
            </a>
          </div>
        ))}
      </section>
    </>
  )
}

/* ── Legal pages (PLACEHOLDER TEXT — have a lawyer review before launch) ── */
function Legal({ title, updated, sections }) {
  return (
    <>
      <PageHero title={title} intro={`Last updated: ${updated}`}>
        <div className="mt-4">
          <SampleTag>Placeholder text — review with a legal professional</SampleTag>
        </div>
      </PageHero>
      <section className="container-x prose-evc max-w-3xl py-12">
        {sections.map(([h, ...ps]) => (
          <div key={h}>
            <h2>{h}</h2>
            {ps.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}
        <p>
          Questions? Email <a className="text-primary underline" href={`mailto:${site.email}`}>{site.email}</a> or <Link to="/contact" className="text-primary underline">contact us</Link>.
        </p>
      </section>
    </>
  )
}

export function Privacy() {
  useSeo({ title: 'Privacy Policy', description: `How ${site.legalName} collects and uses your personal information.` })
  return (
    <Legal
      title="Privacy Policy"
      updated="[date]"
      sections={[
        ['Who we are', `${site.legalName} ("we", "us") operates this website and sells Evafresh cleaning products in Ghana. We aim to handle personal data in line with Ghana's Data Protection Act, 2012 (Act 843).`],
        ['What we collect', 'When you order, contact us or subscribe, we collect your name, phone number, email (if given), delivery address and GhanaPost GPS address, and your order details. We do not see or store your card details or mobile money PIN — payments are handled by our payment provider.'],
        ['How we use it', 'To process and deliver your orders, contact you about your order, run our rewards programme, and (only if you subscribe) send you tips and offers. You can unsubscribe at any time.'],
        ['Who we share it with', 'Delivery partners (to deliver your order), payment providers (to process payment), and WhatsApp/Meta when you choose to message us on WhatsApp. We never sell your personal data.'],
        ['Cookies', 'We use essential browser storage to remember your cart and cookie choice. With your consent we may use analytics cookies to understand how the site is used.'],
        ['Your rights', 'You can ask to see, correct or delete the personal data we hold about you by contacting us.'],
        ['Keeping data', 'We keep order records for as long as needed for accounting and legal purposes, then delete them.'],
      ]}
    />
  )
}

export function Terms() {
  useSeo({ title: 'Terms & Conditions', description: `Terms of sale for orders placed with ${site.legalName}.` })
  return (
    <Legal
      title="Terms & Conditions"
      updated="[date]"
      sections={[
        ['About these terms', `These terms apply to all orders placed with ${site.legalName} through this website or WhatsApp.`],
        ['Prices and payment', 'All prices are in Ghana cedis (GH₵). We may change prices at any time, but you pay the price shown when you order. Mobile money payments are made to our MTN MoMo wallet 025 611 6151 (Evaclear Trading Enterprise). Card (VISA) payments, bank transfers, cash deposits and cheques are paid to Evaclear Trading Enterprise, Ecobank, Harper Road Adum Branch, account number 1441005160147. Cheques must be made payable to Evaclear Trading Enterprise; orders paid by cheque are dispatched once the cheque has cleared. Orders are dispatched once we have confirmed your payment. WhatsApp orders are confirmed once we receive payment or agree pay-on-delivery with you.'],
        ['Delivery', `Delivery fees depend on your area and are shown at checkout. ${HOME_AREA} orders over ${ghs(FREE_THRESHOLD)} qualify for free delivery. Delivery times are estimates and may be affected by weather, traffic or public holidays.`],
        ['Customer accounts and credit', 'Credit accounts are offered at our discretion after we review your application. We set your credit limit and payment terms and may change, suspend or close a credit account at any time. Credit orders must be paid in full by the due date shown in your account. New credit orders cannot be placed while any balance is overdue. You are responsible for keeping your login details secure and for orders placed through your account.'],
        ['Returns and refunds', 'If your order arrives damaged or incorrect, contact us within 48 hours with a photo and we will replace or refund it. See our Help Centre for full details.'],
        ['Product use and safety', 'Always read the label and follow the directions and safety warnings. Keep products out of reach of children. Never mix cleaning products. We are not responsible for damage caused by misuse.'],
        ['Contact', `${site.legalName}, ${site.address.street}, ${site.address.area}, ${site.address.city} (digital address ${site.address.gps}), Ghana. Phone ${site.phones.join(', ')}. WhatsApp ${site.whatsapp.display}. Email ${site.email}.`],
      ]}
    />
  )
}
