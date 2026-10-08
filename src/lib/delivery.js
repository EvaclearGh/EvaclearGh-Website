import delivery from '../data/delivery.json'

export const FREE_THRESHOLD = delivery.freeDeliveryThreshold
export const HOME_AREA = delivery.homeArea || 'Kumasi'
export const zones = delivery.zones
export const pickup = delivery.pickup

/** method: "delivery" | "pickup" */
export function deliveryFee({ method, zoneId, subtotal }) {
  if (method === 'pickup') return pickup.fee || 0
  const zone = zones.find((z) => z.id === zoneId)
  if (!zone) return null
  if (zone.freeAboveThreshold && subtotal >= FREE_THRESHOLD) return 0
  return zone.fee
}

export function zoneById(id) {
  return zones.find((z) => z.id === id) || null
}
