import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuChevronDown, LuMenu, LuSearch, LuShoppingBag, LuUser, LuX } from 'react-icons/lu'
import nav from '../data/navigation.json'
import site from '../data/site.json'
import { Link, useRouter } from '../lib/router.jsx'
import { ghs } from '../lib/format.js'
import { FREE_THRESHOLD } from '../lib/delivery.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import Img from '../lib/Img.jsx'
import Logo from './Logo.jsx'
import SearchPanel from './SearchPanel.jsx'
import useDialog from '../lib/useDialog.js'

export function AnnouncementBar() {
  return (
    <div className="on-dark bg-primary-dark text-white">
      <p className="container-x flex min-h-10 flex-wrap items-center justify-center gap-x-2 py-2 text-center text-sm">
        <span>
          {site.announcement.text} <strong>{ghs(FREE_THRESHOLD)}</strong>
        </span>
        <span aria-hidden="true">·</span>
        <Link to={site.announcement.link} className="font-bold underline underline-offset-4 hover:text-lime">
          {site.announcement.linkText}
        </Link>
      </p>
    </div>
  )
}

const menus = [
  { id: 'shop', label: 'Shop' },
  { id: 'learn', label: 'Learn' },
  { id: 'rewards', label: 'Rewards' },
]

function MenuLink({ to, children, onNavigate }) {
  return (
    <Link to={to} onClick={onNavigate} className="block rounded-lg py-1.5 text-ink transition hover:translate-x-0.5 hover:text-primary">
      {children}
    </Link>
  )
}

function MegaPanel({ id, onNavigate }) {
  if (id === 'shop') {
    return (
      <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_1fr_2fr]">
        <div>
          <p className="eyebrow mb-3">Shop</p>
          <ul>
            {nav.shop.featured.map((l) => (
              <li key={l.to}>
                <MenuLink to={l.to} onNavigate={onNavigate}>
                  {l.label}
                </MenuLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Categories</p>
          <ul>
            {nav.shop.categories.map((l) => (
              <li key={l.to}>
                <MenuLink to={l.to} onNavigate={onNavigate}>
                  {l.label}
                </MenuLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {nav.shop.promos.map((p) => (
            <Link key={p.to} to={p.to} onClick={onNavigate} className="group relative block overflow-hidden rounded-card bg-white">
              <Img src={p.image} alt="" className="aspect-[4/3] w-full transition duration-500 group-hover:scale-105" fit="cover" sizesAttr="300px" />
              <span className="block p-4">
                <span className="block font-heading text-lg text-ink">{p.title}</span>
                <span className="text-sm text-muted">{p.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    )
  }
  const list = id === 'learn' ? nav.learn : nav.rewards
  return (
    <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_2fr]">
      <ul>
        {list.map((l) => (
          <li key={l.label}>
            <MenuLink to={l.to} onNavigate={onNavigate}>
              {l.label}
            </MenuLink>
          </li>
        ))}
      </ul>
      <div className="rounded-card bg-aqua-soft p-6">
        {id === 'learn' ? (
          <>
            <p className="font-heading text-xl">New to refills?</p>
            <p className="mt-2 text-muted">See how to buy big, refill your bottles and save on every litre.</p>
            <Link to="/how-it-works" onClick={onNavigate} className="btn btn-primary mt-4">
              How It Works
            </Link>
          </>
        ) : (
          <>
            <p className="font-heading text-xl">Earn points on every order</p>
            <p className="mt-2 text-muted">Collect points, unlock discounts and get a gift when you refer a friend.</p>
            <Link to="/rewards" onClick={onNavigate} className="btn btn-primary mt-4">
              Learn about Rewards
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

function MobileSection({ id, label, section, setSection, children }) {
  return (
    <div className="border-b border-line">
      <button type="button" className="flex w-full items-center justify-between py-4 text-left text-lg font-bold" aria-expanded={section === id} onClick={() => setSection(section === id ? '' : id)}>
        {label} <LuChevronDown aria-hidden="true" className={`transition ${section === id ? 'rotate-180' : ''}`} />
      </button>
      {section === id && <div className="pb-4">{children}</div>}
    </div>
  )
}

function MobileMenu({ open, onClose }) {
  const ref = useDialog(open, onClose)
  const auth = useAuth()
  const [section, setSection] = useState('shop')
  if (!open) return null
  const links = (arr) => (
    <ul>
      {arr.map((l) => (
        <li key={l.label}>
          <Link to={l.to} onClick={onClose} className="block py-2 text-ink hover:text-primary">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
  // Rendered into <body> so the sticky header's blur effect can't clip it
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-bg p-5 shadow-2xl fade-up">
        <div className="mb-4 flex items-center justify-between">
          <Logo />
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label="Close menu">
            <LuX size={22} aria-hidden="true" />
          </button>
        </div>
        <MobileSection id="shop" label="Shop" section={section} setSection={setSection}>
          <p className="eyebrow mb-1 mt-1">Shop</p>
          {links(nav.shop.featured)}
          <p className="eyebrow mb-1 mt-4">Categories</p>
          {links(nav.shop.categories)}
        </MobileSection>
        <MobileSection id="learn" label="Learn" section={section} setSection={setSection}>
          {links(nav.learn)}
        </MobileSection>
        <MobileSection id="rewards" label="Rewards" section={section} setSection={setSection}>
          {links(nav.rewards)}
        </MobileSection>
        <div className="mt-4 flex flex-col gap-2">
          <Link to="/wholesale" onClick={onClose} className="py-2 font-bold">
            Wholesale & Bulk Orders
          </Link>
          <Link to="/contact" onClick={onClose} className="py-2 font-bold">
            Contact Us
          </Link>
          <Link to="/account" onClick={onClose} className="py-2 font-bold">
            {auth?.user ? 'My Account' : 'Log in / Create account'}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function Header() {
  const [active, setActive] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { count, setOpen } = useCart()
  const auth = useAuth()
  const { pathname } = useRouter()
  const navRef = useRef(null)
  const hoverTimer = useRef()

  // close menus on route change
  useEffect(() => {
    setActive(null)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!active) return
    const onDoc = (e) => {
      if (!navRef.current?.contains(e.target)) setActive(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        document.getElementById(`menu-btn-${active}`)?.focus()
        setActive(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  const hoverOpen = (id) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setActive(id), 120)
  }
  const hoverClose = () => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setActive(null), 200)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <div ref={navRef} className="relative" onMouseLeave={hoverClose}>
        <div className="container-x flex h-16 items-center gap-2 lg:h-20">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label="Open menu" aria-haspopup="dialog" onClick={() => setMobileOpen(true)}>
            <LuMenu size={22} aria-hidden="true" />
          </button>
          <Link to="/" className="mr-auto rounded-lg lg:mr-10" aria-label={`${site.name} home`}>
            <Logo />
          </Link>
          <nav aria-label="Main" className="mr-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {menus.map((m) => (
                <li key={m.id} onMouseEnter={() => hoverOpen(m.id)}>
                  <button
                    type="button"
                    className={`flex items-center gap-1 rounded-full px-4 py-2 font-semibold transition hover:bg-sand ${active === m.id ? 'bg-sand text-primary' : ''}`}
                    aria-expanded={active === m.id}
                    aria-controls={`mega-${m.id}`}
                    id={`menu-btn-${m.id}`}
                    onClick={(e) => {
                      const next = active === m.id ? null : m.id
                      setActive(next)
                      // keyboard users: move focus into the opened panel
                      if (next && e.detail === 0) setTimeout(() => document.querySelector(`#mega-${m.id} a`)?.focus(), 60)
                    }}
                  >
                    {m.label}
                    <LuChevronDown aria-hidden="true" className={`transition ${active === m.id ? 'rotate-180' : ''}`} />
                  </button>
                </li>
              ))}
              <li onMouseEnter={() => hoverOpen(null)}>
                <Link to="/wholesale" className="rounded-full px-4 py-2 font-semibold transition hover:bg-sand">
                  Wholesale
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label="Search products" aria-haspopup="dialog" onClick={() => setSearchOpen(true)}>
              <LuSearch size={21} aria-hidden="true" />
            </button>
            <Link to="/account" className="relative hidden h-11 w-11 place-items-center rounded-full hover:bg-sand sm:grid" aria-label={auth?.user ? `My account (logged in as ${auth.profile?.business_name || auth.profile?.full_name || auth.user.email})` : 'My account / log in'}>
              <LuUser size={21} aria-hidden="true" />
              {auth?.user && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-lime ring-2 ring-bg" />}
            </Link>
            <button type="button" className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
              <LuShoppingBag size={21} aria-hidden="true" />
              {count > 0 && (
                <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        {menus.map((m) =>
          active === m.id ? (
            <div
              key={m.id}
              id={`mega-${m.id}`}
              onMouseEnter={() => clearTimeout(hoverTimer.current)}
              className="absolute inset-x-0 top-full hidden border-b border-line bg-bg shadow-xl lg:block fade-up"
            >
              <MegaPanel id={m.id} onNavigate={() => setActive(null)} />
            </div>
          ) : null,
        )}
      </div>
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
