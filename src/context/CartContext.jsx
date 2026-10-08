import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { compareAtFor, getProduct, getVariant } from '../lib/catalog.js'
import { FREE_THRESHOLD } from '../lib/delivery.js'

const CartCtx = createContext(null)
const STORAGE_KEY = 'evaclear-cart-v1'

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.items
    case 'add': {
      const key = `${action.productId}::${action.variantId}`
      const found = state.find((i) => i.key === key)
      if (found) return state.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + action.qty) } : i))
      return [...state, { key, productId: action.productId, variantId: action.variantId, qty: action.qty }]
    }
    case 'setQty':
      return state
        .map((i) => (i.key === action.key ? { ...i, qty: Math.max(0, Math.min(99, action.qty)) } : i))
        .filter((i) => i.qty > 0)
    case 'remove':
      return state.filter((i) => i.key !== action.key)
    case 'clear':
      return []
    default:
      return state
  }
}

export function variantLabel(v) {
  return [v?.scent, v?.size].filter(Boolean).join(' · ')
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  // Restore the cart after first render (keeps pre-rendered HTML and the browser in sync)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(saved)) dispatch({ type: 'load', items: saved.filter((i) => getProduct(i.productId)) })
    } catch {
      /* storage unavailable — cart lives in memory only */
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items, loaded])

  const lines = useMemo(
    () =>
      items
        .map((i) => {
          const product = getProduct(i.productId)
          const variant = getVariant(product, i.variantId)
          if (!product || !variant) return null
          return {
            ...i,
            product,
            variant,
            name: product.name,
            variantLabel: variantLabel(variant),
            price: variant.price,
            compareAt: compareAtFor(product, variant),
            image: variant.image || product.images[0],
          }
        })
        .filter(Boolean),
    [items],
  )

  const count = lines.reduce((s, l) => s + l.qty, 0)
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const awayFromFree = Math.max(0, FREE_THRESHOLD - subtotal)

  const add = useCallback((productId, variantId, qty = 1, { openDrawer = true } = {}) => {
    dispatch({ type: 'add', productId, variantId, qty })
    const p = getProduct(productId)
    setAnnouncement(`${p?.name || 'Item'} added to your cart`)
    if (openDrawer) setOpen(true)
  }, [])

  const value = {
    lines,
    count,
    subtotal,
    awayFromFree,
    freeThreshold: FREE_THRESHOLD,
    ready: loaded,
    open,
    setOpen,
    add,
    setQty: (key, qty) => dispatch({ type: 'setQty', key, qty }),
    remove: (key) => dispatch({ type: 'remove', key }),
    clear: () => dispatch({ type: 'clear' }),
  }

  return (
    <CartCtx.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </CartCtx.Provider>
  )
}

export function useCart() {
  return useContext(CartCtx)
}
