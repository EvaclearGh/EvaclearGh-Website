import { LuShoppingBag, LuTrash2, LuTruck, LuX } from 'react-icons/lu'
import { useCart } from '../context/CartContext.jsx'
import { getProduct, productUrl } from '../lib/catalog.js'
import { ghs } from '../lib/format.js'
import { Link, useRouter } from '../lib/router.jsx'
import Img from '../lib/Img.jsx'
import useDialog from '../lib/useDialog.js'
import { QtyControl } from './ui.jsx'
import { waLink } from '../lib/whatsapp.js'
import { HOME_AREA } from '../lib/delivery.js'

// Suggested add-ons shown in the drawer (edit the IDs to change them)
const ADD_ON_IDS = ['multi-surface-cleaner', 'fabric-softener', 'body-hand-wash', 'floor-cleaner', 'microfibre-cloths', 'glass-cleaner']

export default function CartDrawer() {
  const { open, setOpen, lines, subtotal, awayFromFree, freeThreshold, setQty, remove, add } = useCart()
  const close = () => setOpen(false)
  const ref = useDialog(open, close)
  const { navigate } = useRouter()
  if (!open) return null

  const inCart = new Set(lines.map((l) => l.productId))
  const addOns = ADD_ON_IDS.filter((id) => !inCart.has(id)).map(getProduct).filter(Boolean).slice(0, 3)
  const progress = Math.min(100, Math.round((subtotal / freeThreshold) * 100))

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40" onClick={close} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="cart-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-bg shadow-2xl fade-up">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="cart-title" className="text-2xl">
            Your cart
          </h2>
          <button type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label="Close cart">
            <LuX size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Free delivery progress */}
        <div className="border-b border-line bg-aqua-soft px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <LuTruck aria-hidden="true" className="text-primary" />
            {awayFromFree > 0 ? (
              <span>
                You're <strong>{ghs(awayFromFree)}</strong> away from free {HOME_AREA} delivery
              </span>
            ) : (
              <span>You've unlocked free delivery in {HOME_AREA}!</span>
            )}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progress to free delivery">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="py-12 text-center">
              <LuShoppingBag size={40} className="mx-auto text-aqua" aria-hidden="true" />
              <p className="mt-4 font-heading text-xl">Your cart is empty</p>
              <p className="mt-1 text-muted">Start with a starter kit — it's the easiest way to try everything.</p>
              <button type="button" onClick={() => { close(); navigate('/collections/starter-packs') }} className="btn btn-primary mt-6">
                Shop Starter Kits
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-4">
                  <Link to={productUrl(l.product)} onClick={close} className="shrink-0" tabIndex={-1} aria-hidden="true">
                    <Img src={l.image} alt="" className="h-20 w-20 rounded-xl bg-white" sizesAttr="80px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={productUrl(l.product)} onClick={close} className="font-semibold leading-snug hover:text-primary">
                        {l.name}
                      </Link>
                      <button type="button" onClick={() => remove(l.key)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-sand hover:text-danger" aria-label={`Remove ${l.name} ${l.variantLabel}`}>
                        <LuTrash2 aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-sm text-muted">{l.variantLabel}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <QtyControl small value={l.qty} onChange={(q) => setQty(l.key, q)} label={`Quantity for ${l.name}`} />
                      <span className="font-bold">{ghs(l.price * l.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {addOns.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-body text-sm font-bold uppercase tracking-wider text-muted">You might also need</h3>
              <ul className="flex flex-col gap-2">
                {addOns.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-2">
                    <Img src={p.variants[0].image || p.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl" sizesAttr="56px" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-sm text-muted">{ghs(p.variants[0].price)}</p>
                    </div>
                    <button type="button" onClick={() => add(p.id, p.variants[0].id, 1, { openDrawer: false })} className="btn btn-outline min-h-9 px-4 py-1.5 text-sm">
                      Add<span className="sr-only"> {p.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-line bg-white px-5 py-4">
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold">Subtotal</span>
              <span className="font-bold">{ghs(subtotal)}</span>
            </div>
            <p className="mb-3 text-sm text-muted">Delivery fee is calculated at checkout.</p>
            <button type="button" onClick={() => { close(); navigate('/checkout') }} className="btn btn-primary w-full">
              Checkout
            </button>
            <a href={waLink('Hello Evaclear! I have a question about my order.')} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Questions? Chat with us on WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
