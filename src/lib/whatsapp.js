import site from '../data/site.json'
import { ghs } from './format.js'

export function waLink(text = site.whatsapp.greeting) {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(text)}`
}

/** Builds the pre-filled WhatsApp order message from the cart + customer details */
export function orderMessage({ items, subtotal, fee, total, customer, method, zoneName, orderRef, momo, bank, credit, online }) {
  const lines = [
    `Hello ${site.name}! I'd like to place an order.`,
    orderRef ? `Order ref: ${orderRef}` : null,
    '',
    '*Items*',
    ...items.map(
      (i) => `• ${i.qty} × ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} — ${ghs(i.price * i.qty)}`,
    ),
    '',
    `Subtotal: ${ghs(subtotal)}`,
    `Delivery: ${fee === null ? 'To be confirmed' : fee === 0 ? 'FREE' : ghs(fee)}`,
    `*Total: ${ghs(total)}*`,
    '',
    '*My details*',
    customer?.name ? `Name: ${customer.name}` : null,
    customer?.phone ? `Phone: ${customer.phone}` : null,
    customer?.email ? `Email: ${customer.email}` : null,
    method === 'pickup' ? 'Delivery method: Pick up from store' : `Delivery to: ${zoneName || ''}`,
    method !== 'pickup' && customer?.address ? `Address: ${customer.address}` : null,
    method !== 'pickup' && customer?.gps ? `GhanaPost GPS: ${customer.gps}` : null,
    customer?.notes ? `Notes: ${customer.notes}` : null,
    ...(online
      ? ['', '*Payment*', `Paid ${ghs(total)} online by card/MoMo (Paystack)`, `Paystack reference: ${online.reference}`, '', 'Please confirm my order. Thank you!']
      : credit
      ? ['', '*Payment*', `On credit account: ${credit.business}`, credit.dueDate ? `Due date: ${credit.dueDate}` : null, '', 'Order placed through my Evaclear account.']
      : momo
      ? [
          '',
          '*Payment*',
          `Paid ${ghs(total)} by ${momo.network} to ${momo.to} (${momo.accountName})`,
          `Transaction ID: ${momo.transactionId}`,
          `Paid from: ${momo.from}`,
          '',
          'Please confirm my payment and order. Thank you!',
        ]
      : bank
        ? [
            '',
            '*Payment*',
            `Paying ${ghs(total)} by ${bank.method} to ${bank.accountName}, ${bank.bankName} ${bank.branch}, A/C ${bank.accountNumber}`,
            bank.reference ? `Deposit slip / transfer / cheque no.: ${bank.reference}` : 'I will send the deposit slip or transfer receipt here.',
            '',
            'Please confirm my payment and order. Thank you!',
          ]
        : ['', 'Please confirm my order and how to pay. Thank you!']),
  ]
  return lines.filter((l) => l !== null).join('\n')
}
