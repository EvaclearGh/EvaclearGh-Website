/*
 * Tiny client-side router (no extra dependency → smaller download on slow networks).
 * - "history" mode: clean URLs like /products/floor-cleaner (default, used in production)
 * - "hash" mode:    /#/products/floor-cleaner (used for single-file previews)
 * Works on the server too (pass `url`) so pages can be pre-rendered for SEO.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const env = import.meta.env || {}
export const ROUTER_MODE = env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'history'

const RouterCtx = createContext(null)

function readLocation() {
  if (typeof window === 'undefined') return { pathname: '/', search: '' }
  if (ROUTER_MODE === 'hash') {
    const raw = window.location.hash.replace(/^#/, '') || '/'
    const [beforeAnchor] = raw.split('#')
    const [pathname, search = ''] = beforeAnchor.split('?')
    return { pathname: pathname || '/', search: search ? `?${search}` : '' }
  }
  return { pathname: window.location.pathname, search: window.location.search }
}

export function hrefFor(to) {
  if (ROUTER_MODE === 'hash') return `#${to}`
  return to
}

export function Router({ url, children }) {
  const initial = useMemo(() => {
    if (url) {
      const [pathname, search = ''] = url.split('?')
      return { pathname, search: search ? `?${search}` : '' }
    }
    return readLocation()
  }, [url])
  const [loc, setLoc] = useState(initial)

  useEffect(() => {
    const onChange = () => setLoc(readLocation())
    window.addEventListener('popstate', onChange)
    if (ROUTER_MODE === 'hash') window.addEventListener('hashchange', onChange)
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener('hashchange', onChange)
    }
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (ROUTER_MODE === 'hash') {
      const target = `#${to}`
      if (replace) window.location.replace(target)
      else window.location.hash = to
    } else {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', to)
    }
    setLoc(readLocation())
    const [, anchor] = to.split('#')
    if (anchor) {
      setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
    }
  }, [])

  const value = useMemo(() => ({ ...loc, navigate }), [loc, navigate])
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>
}

export function useRouter() {
  return useContext(RouterCtx)
}

export function useSearchParams() {
  const { search } = useRouter()
  return useMemo(() => new URLSearchParams(search), [search])
}

/** Match "/products/:slug" against a pathname. Returns params or null. */
export function matchPath(pattern, pathname) {
  const clean = (s) => s.replace(/\/+$/, '') || '/'
  const p = clean(pattern).split('/')
  const a = clean(pathname).split('/')
  if (p.length !== a.length) return null
  const params = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i])
    else if (p[i] !== a[i]) return null
  }
  return params
}

export function Link({ to, onClick, children, ...rest }) {
  const router = useRouter()
  const external = /^(https?:|mailto:|tel:)/.test(to)
  if (external) {
    return (
      <a href={to} onClick={onClick} {...rest}>
        {children}
      </a>
    )
  }
  const handle = (e) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    router.navigate(to)
  }
  return (
    <a href={hrefFor(to)} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
