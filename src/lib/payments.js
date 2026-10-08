/*
 * Online payments (Mobile Money + cards) via Paystack or Flutterwave.
 *
 * 1. Put your PUBLIC key in .env (see .env.example):
 *      VITE_PAYMENT_PROVIDER=paystack
 *      VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
 * 2. Deploy /server/verify-payment.js and set VITE_VERIFY_PAYMENT_URL so every
 *    payment is checked with your SECRET key on the server before you ship.
 *
 * Until a key is added, the checkout shows "online payment coming soon" and
 * customers can still order via WhatsApp.
 */
import site from '../data/site.json'

const env = import.meta.env || {}
export const PROVIDER = (env.VITE_PAYMENT_PROVIDER || 'paystack').toLowerCase()
const KEYS = {
  paystack: env.VITE_PAYSTACK_PUBLIC_KEY || '',
  flutterwave: env.VITE_FLUTTERWAVE_PUBLIC_KEY || '',
}
export const VERIFY_URL = env.VITE_VERIFY_PAYMENT_URL || ''

export function onlinePaymentsEnabled() {
  return !!KEYS[PROVIDER]
}

const SCRIPTS = {
  paystack: 'https://js.paystack.co/v2/inline.js',
  flutterwave: 'https://checkout.flutterwave.com/v3.js',
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'))
    document.head.appendChild(s)
  })
}

/**
 * Opens the provider's secure payment popup.
 * @returns Promise resolving to { reference, provider } on success, or rejecting on cancel/failure.
 */
export async function payOnline({ amount, email, phone, name, reference, items }) {
  if (!onlinePaymentsEnabled()) throw new Error('Online payment is not set up yet.')
  await loadScript(SCRIPTS[PROVIDER])

  if (PROVIDER === 'paystack') {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      const popup = new window.PaystackPop()
      popup.newTransaction({
        key: KEYS.paystack,
        email: email || `${phone.replace(/\D/g, '')}@customers.evacleartradingenterprise.com`,
        amount: Math.round(amount * 100), // pesewas
        currency: 'GHS',
        reference,
        channels: ['mobile_money', 'card'],
        metadata: {
          custom_fields: [
            { display_name: 'Customer', variable_name: 'customer', value: name },
            { display_name: 'Phone', variable_name: 'phone', value: phone },
            { display_name: 'Items', variable_name: 'items', value: items },
          ],
        },
        onSuccess: (tx) => resolve({ reference: tx.reference, provider: 'paystack' }),
        onCancel: () => reject(new Error('Payment cancelled.')),
        onError: (e) => reject(new Error(e?.message || 'Payment failed.')),
      })
    })
  }

  if (PROVIDER === 'flutterwave') {
    return new Promise((resolve, reject) => {
      let done = false
      // eslint-disable-next-line no-undef
      window.FlutterwaveCheckout({
        public_key: KEYS.flutterwave,
        tx_ref: reference,
        amount,
        currency: 'GHS',
        payment_options: 'mobilemoneyghana, card',
        customer: { email: email || 'customer@evacleartradingenterprise.com', phone_number: phone, name },
        customizations: { title: site.name, description: 'Order payment', logo: `${site.siteUrl}/favicon.svg` },
        callback: (res) => {
          done = true
          if (res.status === 'successful' || res.status === 'completed') resolve({ reference: res.tx_ref, provider: 'flutterwave', transactionId: res.transaction_id })
          else reject(new Error('Payment was not completed.'))
        },
        onclose: () => {
          if (!done) reject(new Error('Payment cancelled.'))
        },
      })
    })
  }

  throw new Error(`Unknown payment provider "${PROVIDER}"`)
}

/** Ask your server to confirm the payment with the SECRET key (recommended). */
export async function verifyPayment({ reference, provider, transactionId }) {
  if (!VERIFY_URL) return { verified: false, skipped: true }
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, provider, transactionId }),
  })
  if (!res.ok) return { verified: false }
  return res.json()
}

export function makeOrderRef() {
  const d = new Date()
  const stamp = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `EVC-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}
