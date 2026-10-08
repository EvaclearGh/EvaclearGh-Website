import { useEffect, useState } from 'react'
import { LuMail, LuMapPin, LuPhone } from 'react-icons/lu'
import { SiFacebook, SiGoogleplay, SiInstagram, SiMastercard, SiTiktok, SiVisa, SiWhatsapp } from 'react-icons/si'
import nav from '../data/navigation.json'
import site from '../data/site.json'
import { Link } from '../lib/router.jsx'
import { waLink } from '../lib/whatsapp.js'
import { onlinePaymentsEnabled } from '../lib/payments.js'
import Logo from './Logo.jsx'
import { NewsletterForm } from './ui.jsx'

export function SocialLinks({ dark = false, size = 20 }) {
  const items = [
    { href: waLink(), label: 'WhatsApp', Icon: SiWhatsapp },
    { href: site.social.instagram, label: 'Instagram', Icon: SiInstagram },
    { href: site.social.facebook, label: 'Facebook', Icon: SiFacebook },
    { href: site.social.tiktok, label: 'TikTok', Icon: SiTiktok },
  ]
  return (
    <ul className="flex gap-2">
      {items.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${site.name} on ${label} (opens in a new tab)`}
            className={`grid h-11 w-11 place-items-center rounded-full transition ${dark ? 'bg-white/10 text-white hover:bg-lime hover:text-ink' : 'bg-white text-primary hover:bg-primary hover:text-white'}`}
          >
            <Icon size={size} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function PaymentIcons() {
  const chip = 'inline-flex h-8 items-center rounded-md px-2.5 text-[11px] font-bold leading-none'
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Payment methods we accept">
      <li className={`${chip} bg-[#FFCB05] text-[#1d1d1b]`}>MTN MoMo</li>
      <li className={`${chip} bg-[#D7141A] text-white`}>Telecel Cash</li>
      <li className={`${chip} bg-[#00377B] text-white`}>AirtelTigo Money</li>
      <li className={`${chip} bg-white text-ink`}>Bank transfer / Cheque</li>
{onlinePaymentsEnabled() && (
        <>
      <li className={`${chip} bg-white text-[#1A1F71]`}>
        <SiVisa size={30} aria-hidden="true" />
        <span className="sr-only">Visa</span>
      </li>
      <li className={`${chip} bg-white text-[#EB001B]`}>
        <SiMastercard size={22} aria-hidden="true" />
        <span className="sr-only">Mastercard</span>
      </li>
            </>
      )}
    </ul>
  )
}

export function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem('evaclear-cookies')) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])
  const choose = (v) => {
    try {
      localStorage.setItem('evaclear-cookies', v)
    } catch {
      /* ignore */
    }
    setShow(false)
  }
  if (!show) return null
  return (
    <div role="region" aria-label="Cookie notice" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-card bg-white p-5 shadow-2xl sm:inset-x-auto sm:left-4 fade-up">
      <p className="text-sm">
        We use essential cookies to keep your cart working and, with your permission, analytics cookies to improve our shop. See our{' '}
        <Link to="/privacy" className="font-semibold text-primary underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose('all')} className="btn btn-primary min-h-10 py-2">
          Accept all
        </button>
        <button type="button" onClick={() => choose('essential')} className="btn btn-outline min-h-10 py-2">
          Essential only
        </button>
      </div>
    </div>
  )
}

export function WhatsAppFloat() {
  return (
    <a
      href={waLink()}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-xl transition hover:scale-105 hover:bg-[#17603c] md:bottom-6"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
    >
      <SiWhatsapp size={28} aria-hidden="true" />
    </a>
  )
}

function AppLink() {
  const url = site.app?.playStoreUrl
  const [inApp, setInApp] = useState(false)
  useEffect(() => {
    setInApp(/EvaclearApp/.test(navigator.userAgent) || window.matchMedia?.('(display-mode: standalone)').matches)
  }, [])
  if (!url || inApp) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn mt-6 border border-white/40 text-white hover:bg-white/10">
      <SiGoogleplay aria-hidden="true" /> Get the Evaclear Android app
    </a>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="on-dark bg-primary-dark text-white">
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[1.4fr_2fr]">
        <div className="max-w-md">
          <Logo light />
          <p className="mt-4 text-white/80">{site.tagline} Evafresh home cleaning products from {site.legalName}, {site.address.city}.</p>
          <h2 className="mt-8 font-body text-lg font-bold">Join our community for cleaning tips and offers</h2>
          <div className="mt-3">
            <NewsletterForm dark compact />
          </div>
          <div className="mt-6">
            <SocialLinks dark />
          </div>
          <AppLink />
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {Object.entries(nav.footer).map(([title, links]) => (
            <nav key={title} aria-label={`${title} links`}>
              <h2 className="font-body text-sm font-bold uppercase tracking-wider text-lime">{title}</h2>
              <ul className="mt-3 space-y-1">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="inline-block py-1 text-white/85 hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="sm:col-span-3">
            <h2 className="font-body text-sm font-bold uppercase tracking-wider text-lime">Get in touch</h2>
            <ul className="mt-3 grid gap-x-8 gap-y-4 text-white/85 sm:grid-cols-2">
              <li className="flex gap-2">
                <LuPhone className="mt-1 shrink-0" aria-hidden="true" />
                <span className="flex flex-col whitespace-nowrap">
                  {site.phones.map((n) => (
                    <a key={n} href={`tel:${n.replace(/\s/g, '')}`} className="hover:text-white">
                      {n}
                    </a>
                  ))}
                  <a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    WhatsApp: {site.whatsapp.display}
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <LuMail className="mt-1 shrink-0" aria-hidden="true" />
                <a href={`mailto:${site.email}`} className="break-all hover:text-white">
                  {site.email}
                </a>
              </li>
              <li className="flex gap-2">
                <LuMapPin className="mt-1 shrink-0" aria-hidden="true" />
                <address className="not-italic">
                  {site.address.street}, {site.address.area}
                  <br />
                  {site.address.city}, {site.address.region} Region
                  <br />
                  Digital address: <span className="whitespace-nowrap">{site.address.gps}</span>
                </address>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="container-x flex flex-col gap-4 py-6 text-sm text-white/75 md:flex-row md:items-center md:justify-between">
          <PaymentIcons />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {year} {site.legalName}</span>
            <Link to="/privacy" className="hover:text-white hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white hover:underline">
              Terms
            </Link>
            <Link to="/admin" className="hover:text-white hover:underline">
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
