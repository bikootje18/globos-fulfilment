import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/orders — list open orders
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, reference, customer_name, status, locked_by, created_at,
      order_items (
        id, quantity, scanned_quantity,
        product:products (id, name, barcode, sku, location)
      )
    `)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/orders/:id — single order
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, reference, customer_name, status, locked_by, created_at,
      order_items (
        id, quantity, scanned_quantity,
        product:products (id, name, barcode, sku, location)
      )
    `)
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Order not found' })
  res.json(data)
})

// POST /api/orders/:id/lock — claim an order for an operator
router.post('/:id/lock', async (req, res) => {
  const { operator } = req.body
  if (!operator) return res.status(400).json({ error: 'operator required' })

  // Check if already locked by someone else
  const { data: existing } = await supabase
    .from('orders')
    .select('locked_by')
    .eq('id', req.params.id)
    .single()

  if (existing?.locked_by && existing.locked_by !== operator) {
    return res.status(409).json({ error: `Order locked by ${existing.locked_by}` })
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ locked_by: operator, status: 'in_progress' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/orders/:id/unlock — release an order
router.post('/:id/unlock', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ locked_by: null, status: 'pending' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/orders/:id/complete — mark order as fulfilled
router.post('/:id/complete', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'completed', locked_by: null, completed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
