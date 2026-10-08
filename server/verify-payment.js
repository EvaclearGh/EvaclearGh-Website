/*
 * Payment verification function — deploy as a serverless function
 * (Netlify: netlify/functions/verify-payment.js, Vercel: api/verify-payment.js).
 *
 * Set these SECRET environment variables in your hosting dashboard (never in the website code):
 *   PAYSTACK_SECRET_KEY=sk_live_xxx
 *   FLUTTERWAVE_SECRET_KEY=FLWSECK-xxx
 * Then set VITE_VERIFY_PAYMENT_URL in .env to this function's URL and rebuild the site.
 *
 * This example uses the standard Web Request/Response API (Netlify Functions v2, Vercel Edge,
 * Cloudflare Workers). Adapt the export if your host needs a different signature.
 */
export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const { reference, provider, transactionId } = await request.json().catch(() => ({}))
  if (!reference) return json({ error: 'Missing reference' }, 400)

  try {
    if (provider === 'paystack') {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      })
      const data = await r.json()
      const ok = data?.data?.status === 'success' && data?.data?.currency === 'GHS'
      // TODO: compare data.data.amount (in pesewas) with your own order total before fulfilling.
      return json({ verified: ok, amount: data?.data?.amount / 100, channel: data?.data?.channel })
    }
    if (provider === 'flutterwave') {
      const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
      })
      const data = await r.json()
      const ok = data?.data?.status === 'successful' && data?.data?.tx_ref === reference && data?.data?.currency === 'GHS'
      return json({ verified: ok, amount: data?.data?.amount })
    }
    return json({ error: 'Unknown provider' }, 400)
  } catch (e) {
    return json({ verified: false, error: 'Verification failed' }, 502)
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
