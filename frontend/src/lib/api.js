const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Verzoek mislukt')
  return data
}

export const api = {
  // Orders
  getOrders: () => request('/api/orders'),
  getOrder: (id) => request(`/api/orders/${id}`),
  lockOrder: (id, operator) =>
    request(`/api/orders/${id}/lock`, { method: 'POST', body: JSON.stringify({ operator }) }),
  unlockOrder: (id) =>
    request(`/api/orders/${id}/unlock`, { method: 'POST' }),
  completeOrder: (id, operator) =>
    request(`/api/orders/${id}/complete`, { method: 'POST', body: JSON.stringify({ operator }) }),
  splitOrder: (id, operator) =>
    request(`/api/orders/${id}/split`, { method: 'POST', body: JSON.stringify({ operator }) }),

  // Scans
  processScan: (barcode, order_id, operator, mode) =>
    request('/api/scans', { method: 'POST', body: JSON.stringify({ barcode, order_id, operator, mode }) }),
  flagOos: (order_item_id, order_id, operator) =>
    request('/api/scans/oos', { method: 'POST', body: JSON.stringify({ order_item_id, order_id, operator }) }),

  // Auth
  verifyManagerPin: (pin) =>
    request('/api/auth/verify-manager-pin', { method: 'POST', body: JSON.stringify({ pin }) }),

  // Upload
  uploadOrders: (file) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/api/upload/orders`, { method: 'POST', body: form })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload mislukt')
        return data
      })
  },

  // Manager
  getDashboard: () => request('/api/manager/dashboard'),
  generateTestOrder: (size, item_count) =>
    request('/api/manager/test-order', { method: 'POST', body: JSON.stringify({ size, item_count }) }),
  deleteTestOrders: () =>
    request('/api/manager/test-orders', { method: 'DELETE' }),
  getSettings: () => request('/api/manager/settings'),
  updateSettings: (patch) =>
    request('/api/manager/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
}
