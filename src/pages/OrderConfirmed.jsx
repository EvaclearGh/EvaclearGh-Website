import { useEffect, useState } from 'react'
import { LuCircleCheck, LuMessageCircle } from 'react-icons/lu'
import { formatDate, ghs } from '../lib/format.js'
import { Link, useSearchParams } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'
import { waLink } from '../lib/whatsapp.js'
import site from '../data/site.json'

export default function OrderConfirmed() {
  useSeo({ title: 'Thank you for your order', noindex: true })
  const ref = useSearchParams().get('ref')
  const [order, setOrder] = useState(null)
  useEffect(() => {
    try {
      setOrder(JSON.parse(sessionStorage.getItem('evaclear-last-order') || 'null'))
    } catch {
      /* ignore */
    }
  }, [])
  const notified = !!order?.notified
  const isWa = !notified && (order?.payment === 'whatsapp' || order?.payment === 'momo' || order?.payment === 'bank')
  const isBank = order?.payment === 'bank'
  const isMomo = order?.payment === 'momo'
  return (
    <section className="container-x max-w-2xl py-16 text-center">
      <LuCircleCheck size={56} className="mx-auto text-primary" aria-hidden="true" />
      <h1 className="mt-4 text-4xl">{isWa ? 'Almost done!' : 'Thank you for your order!'}</h1>
      {ref && <p className="mt-2 font-semibold">Order reference: {ref}</p>}
      <p className="mt-4 text-muted">
        {notified && order?.payment !== 'credit'
          ? `Thank you, ${order.name || 'we have your order'}! A copy of your order has been sent to our team on WhatsApp. ${
              order.payment === 'momo'
                ? `We'll check your MoMo payment (Transaction ID ${order.momoTxn}) and call you to confirm delivery.`
                : order.payment === 'bank'
                  ? `Please send a photo of your ${order.bankMethod === 'Cheque' ? 'cheque' : 'receipt or deposit slip'} on WhatsApp. We'll confirm your payment and arrange delivery.`
                  : order.payment === 'online'
                    ? "We'll confirm your payment and call you to arrange delivery."
                    : "We'll call you shortly to confirm your order and payment."
            }`
          : order?.payment === 'credit'
          ? `Your order has been placed on your credit account${order.dueDate ? ` and is due for payment by ${formatDate(order.dueDate)}` : ''}. Our team will confirm it and arrange delivery. You can follow it in My Account.`
          : isBank
          ? `Send your order to us on WhatsApp with the button below (if WhatsApp hasn't opened already), then send a photo of your ${order.bankMethod === 'Cheque' ? 'cheque' : 'receipt or deposit slip'}. We'll confirm your payment and arrange delivery.`
          : isMomo
          ? `Send your order and MoMo Transaction ID (${order.momoTxn}) to us on WhatsApp with the button below (if WhatsApp hasn't opened already). We'll check the payment and confirm your delivery.`
          : isWa
          ? 'Send your order to us on WhatsApp with the button below (if WhatsApp hasn\'t opened already), so we can confirm your order and payment.'
          : order?.payment === 'online'
            ? `Your payment was received${order.verified ? ' and confirmed' : ''}. We'll contact you shortly to arrange delivery.`
            : "We'll be in touch shortly to confirm your order."}
      </p>
      {order?.waUrl && (
        <a href={order.waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-6">
          <LuMessageCircle aria-hidden="true" /> {notified ? (order?.payment === 'bank' ? 'Send slip on WhatsApp' : 'Chat with us on WhatsApp (optional)') : order?.payment === 'credit' ? 'Let us know on WhatsApp (optional)' : isWa ? 'Send my order on WhatsApp' : 'Message us on WhatsApp'}
        </a>
      )}
      {order && (
        <div className="card mt-10 p-6 text-left">
          <h2 className="text-2xl">Order summary</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {order.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-4">
                <span>
                  {i.qty} × {i.name} <span className="text-muted">({i.variantLabel})</span>
                </span>
                <span>{ghs(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
            <span>Total</span>
            <span>{ghs(order.total)}</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {order.method === 'pickup' ? 'Pickup' : `Delivery to ${order.zone}`}: {order.estimate}
          </p>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {order?.payment === 'credit' && (
          <>
            <Link to="/account" className="btn btn-primary">
              View my account
            </Link>
            {ref && (
              <Link to={`/account/invoice?ref=${encodeURIComponent(ref)}`} className="btn btn-outline">
                View invoice
              </Link>
            )}
          </>
        )}
        <Link to="/shop" className="btn btn-outline">
          Continue shopping
        </Link>
        {!order?.waUrl && (
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
            Chat with us
          </a>
        )}
      </div>
    </section>
  )
}
