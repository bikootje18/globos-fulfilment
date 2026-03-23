const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Orders
  getOrders: () => request('/api/orders'),
  getOrder: (id) => request(`/api/orders/${id}`),
  lockOrder: (id, operator) =>
    request(`/api/orders/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ operator })
    }),
  unlockOrder: (id) =>
    request(`/api/orders/${id}/unlock`, { method: 'POST' }),
  completeOrder: (id) =>
    request(`/api/orders/${id}/complete`, { method: 'POST' }),

  // Scans
  processScan: (barcode, order_id, operator, mode) =>
    request('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ barcode, order_id, operator, mode })
    })
}
