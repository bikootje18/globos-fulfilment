import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// Helper: midnight of today in UTC ISO string
function todayMidnightUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

// GET /api/manager/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const since = todayMidnightUTC()

    // 1. Today's order stats (non-test orders)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at, completed_at')
      .gte('created_at', since)

    if (ordersError) return res.status(500).json({ error: ordersError.message })

    const total = orders.length
    const open = orders.filter(o => o.status === 'pending').length
    const inProgress = orders.filter(o => o.status === 'in_progress').length
    const completed = orders.filter(o => o.status === 'completed').length

    const completedOrders = orders.filter(
      o => o.status === 'completed' && o.completed_at && o.created_at
    )
    let avgPickTimeMs = null
    if (completedOrders.length > 0) {
      const totalMs = completedOrders.reduce(
        (sum, o) => sum + (new Date(o.completed_at) - new Date(o.created_at)),
        0
      )
      avgPickTimeMs = Math.round(totalMs / completedOrders.length)
    }

    // 2. Operator ranking from order_complete events today
    const { data: completeEvents, error: eventsError } = await supabase
      .from('events')
      .select('operator')
      .eq('type', 'order_complete')
      .gte('created_at', since)

    if (eventsError) return res.status(500).json({ error: eventsError.message })

    const operatorCounts = {}
    for (const ev of completeEvents || []) {
      if (ev.operator) {
        operatorCounts[ev.operator] = (operatorCounts[ev.operator] || 0) + 1
      }
    }
    const operatorRanking = Object.entries(operatorCounts)
      .map(([name, orders]) => ({ name, orders }))
      .sort((a, b) => b.orders - a.orders)

    // 3. Top 10 scanned products today (outgoing mode)
    const { data: scanRows, error: scanError } = await supabase
      .from('scan_log')
      .select('product_id, product:products(name, sku, location)')
      .eq('mode', 'outgoing')
      .gte('scanned_at', since)

    if (scanError) return res.status(500).json({ error: scanError.message })

    const productCountMap = {}
    const productInfoMap = {}
    for (const row of scanRows || []) {
      const pid = row.product_id
      productCountMap[pid] = (productCountMap[pid] || 0) + 1
      if (!productInfoMap[pid] && row.product) {
        productInfoMap[pid] = row.product
      }
    }
    const topProducts = Object.entries(productCountMap)
      .map(([pid, count]) => ({ product: productInfoMap[pid] || null, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 4. OOS events today, descending
    const { data: oosEvents, error: oosError } = await supabase
      .from('events')
      .select('*')
      .eq('type', 'out_of_stock_flag')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (oosError) return res.status(500).json({ error: oosError.message })

    res.json({
      today: { total, open, inProgress, completed, avgPickTimeMs },
      operatorRanking,
      topProducts,
      oosEvents: oosEvents || [],
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/manager/demo-order
router.post('/demo-order', async (req, res) => {
  try {
    const DEMO_SKUS = ['8868', '8871']

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name')
      .in('sku', DEMO_SKUS)

    if (prodError) return res.status(500).json({ error: prodError.message })
    if (!products || products.length === 0) {
      return res.status(422).json({ error: 'Demo-producten niet gevonden in catalogus' })
    }

    const reference = `DEMO-${Date.now()}`
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ reference, customer_name: 'Demo Order', status: 'pending', is_test: true })
      .select()
      .single()

    if (orderError) return res.status(500).json({ error: orderError.message })

    const items = products.map(p => ({
      order_id: order.id,
      product_id: p.id,
      quantity: 1,
      scanned_quantity: 0,
      out_of_stock_quantity: 0,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) return res.status(500).json({ error: itemsError.message })

    res.json({ order_id: order.id, reference, items_count: items.length })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/manager/test-order
router.post('/test-order', async (req, res) => {
  try {
    const { size = 'medium', item_count } = req.body

    const sizeRanges = {
      small:  [5, 15],
      medium: [20, 40],
      large:  [50, 100],
      xl:     [200, 300],
    }

    let targetCount
    if (size === 'custom') {
      targetCount = typeof item_count === 'number' ? item_count : 20
    } else {
      const range = sizeRanges[size] || sizeRanges.medium
      const [min, max] = range
      targetCount = Math.floor(Math.random() * (max - min + 1)) + min
    }

    // Fetch up to 500 products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id')
      .limit(500)

    if (prodError) return res.status(500).json({ error: prodError.message })
    if (!products || products.length === 0) {
      return res.status(422).json({ error: 'Geen producten in catalogus voor testorder' })
    }

    // Shuffle and pick
    const shuffled = [...products].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(targetCount, shuffled.length))

    // Create the order
    const reference = `TEST-${Date.now()}`
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        reference,
        customer_name: 'Test Order',
        status: 'pending',
        is_test: true,
      })
      .select()
      .single()

    if (orderError) return res.status(500).json({ error: orderError.message })

    // Create order items with quantity 1–3
    const items = selected.map(p => ({
      order_id: order.id,
      product_id: p.id,
      quantity: Math.floor(Math.random() * 3) + 1,
      scanned_quantity: 0,
      out_of_stock_quantity: 0,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) return res.status(500).json({ error: itemsError.message })

    res.json({ order_id: order.id, reference, items_count: items.length })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// DELETE /api/manager/test-orders
router.delete('/test-orders', async (req, res) => {
  try {
    const { data: testOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('is_test', true)

    if (fetchError) return res.status(500).json({ error: fetchError.message })

    if (!testOrders || testOrders.length === 0) {
      return res.json({ deleted: 0 })
    }

    const { error: deleteError, count } = await supabase
      .from('orders')
      .delete({ count: 'exact' })
      .eq('is_test', true)

    if (deleteError) return res.status(500).json({ error: deleteError.message })

    res.json({ deleted: count ?? testOrders.length })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/manager/import-products
router.post('/import-products', async (req, res) => {
  try {
    const { products } = req.body
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Geen producten aangeleverd' })
    }

    const rows = products.map(p => ({
      name: p.name,
      sku: p.sku,
      location: p.location || null,
    }))

    const BATCH = 500
    let imported = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await supabase
        .from('products')
        .upsert(batch, { onConflict: 'sku' })
      if (error) return res.status(500).json({ error: error.message })
      imported += batch.length
    }

    res.json({ imported })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// GET /api/manager/settings
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) return res.status(500).json({ error: error.message })
    const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// PATCH /api/manager/settings
const ALLOWED_SETTINGS = ['split_threshold', 'box_target_weight_grams', 'box_max_weight_grams']

router.patch('/settings', async (req, res) => {
  try {
    const updates = req.body
    const upserts = Object.entries(updates)
      .filter(([key]) => ALLOWED_SETTINGS.includes(key))
      .map(([key, value]) => ({ key, value: String(value) }))

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert(upserts, { onConflict: 'key' })
      if (upsertError) return res.status(500).json({ error: upsertError.message })
    }

    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) return res.status(500).json({ error: error.message })
    const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
