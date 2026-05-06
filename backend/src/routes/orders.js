import { Router } from 'express'
import { supabase } from '../supabase.js'
import { snakeSort } from '../lib/routing.js'
import { packBoxes } from '../lib/boxing.js'
import { splitAtMedian } from '../lib/splitting.js'

const router = Router()

// GET /api/orders — list open orders (includes split suggestion flag)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, reference, customer_name, status, locked_by, created_at, is_test,
        expected_box_count, total_weight_grams,
        order_items (
          id, quantity, scanned_quantity, out_of_stock_quantity,
          product:products (id, name, barcode, sku, location, column_position, column_side, weight_grams)
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })

    const { data: settingsRows } = await supabase.from('settings').select('key, value')
    const settings = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]))
    const splitThreshold = parseInt(settings.split_threshold) || 50

    const annotated = (data || []).map(order => {
      const totalQty = (order.order_items || []).reduce((s, i) => s + i.quantity, 0)
      return { ...order, split_suggested: totalQty > splitThreshold }
    })

    res.json(annotated)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// GET /api/orders/:id — single order with boxes and sub-orders
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, reference, customer_name, status, locked_by, created_at, is_test,
        total_weight_grams, expected_box_count,
        order_items (
          id, quantity, scanned_quantity, out_of_stock_quantity,
          product:products (id, name, barcode, sku, location, column_position, column_side, weight_grams)
        ),
        boxes (
          id, sequence_number, weight_grams,
          box_items (order_item_id, quantity)
        ),
        sub_orders (
          id, sequence_number, status, assigned_operator,
          sub_order_items (order_item_id)
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) return res.status(404).json({ error: 'Order niet gevonden' })

    if (data.boxes) data.boxes.sort((a, b) => a.sequence_number - b.sequence_number)
    if (data.sub_orders) data.sub_orders.sort((a, b) => a.sequence_number - b.sequence_number)

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/orders/:id/lock
router.post('/:id/lock', async (req, res) => {
  try {
    const { operator } = req.body
    if (!operator) return res.status(400).json({ error: 'operator verplicht' })

    const { data: existing } = await supabase
      .from('orders').select('locked_by').eq('id', req.params.id).single()

    if (existing?.locked_by && existing.locked_by !== operator) {
      return res.status(409).json({ error: `Order is vergrendeld door ${existing.locked_by}` })
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ locked_by: operator, status: 'in_progress' })
      .eq('id', req.params.id)
      .select().single()

    if (error) return res.status(500).json({ error: error.message })

    await supabase.from('events').insert({
      type: 'order_start',
      operator,
      order_id: req.params.id,
      payload: {},
    })

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/orders/:id/unlock
router.post('/:id/unlock', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ locked_by: null, status: 'pending' })
      .eq('id', req.params.id)
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/orders/:id/complete — blocks if any item is under-picked and not OOS-flagged
router.post('/:id/complete', async (req, res) => {
  try {
    const { operator } = req.body

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, scanned_quantity, out_of_stock_quantity, product:products(name))')
      .eq('id', req.params.id)
      .single()

    if (fetchError) return res.status(404).json({ error: 'Order niet gevonden' })

    const blocking = (order.order_items || []).filter(
      item => item.scanned_quantity + item.out_of_stock_quantity < item.quantity
    )

    if (blocking.length > 0) {
      return res.status(422).json({
        result: 'blocked',
        error: 'Order heeft items die nog niet volledig gescand of als ontbrekend gemarkeerd zijn',
        blocking_items: blocking.map(i => ({
          id: i.id,
          name: i.product?.name,
          needed: i.quantity,
          scanned: i.scanned_quantity,
          oos: i.out_of_stock_quantity,
          missing: i.quantity - i.scanned_quantity - i.out_of_stock_quantity,
        })),
      })
    }

    const { data: completed, error } = await supabase
      .from('orders')
      .update({ status: 'completed', locked_by: null, completed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()

    if (error) return res.status(500).json({ error: error.message })

    await supabase.from('events').insert({
      type: 'order_complete',
      operator: operator || null,
      order_id: order.id,
      payload: { reference: order.reference },
    })

    res.json(completed)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/orders/:id/split — split order into two sub-orders
router.post('/:id/split', async (req, res) => {
  try {
    const { operator } = req.body

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, scanned_quantity, product:products(*))')
      .eq('id', req.params.id)
      .single()

    if (fetchError) return res.status(404).json({ error: 'Order niet gevonden' })

    const { data: settingsRows } = await supabase.from('settings').select('key, value')
    const settings = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]))
    const splitThreshold = parseInt(settings.split_threshold) || 50
    const targetWeight = parseInt(settings.box_target_weight_grams) || 28000

    const sortedItems = snakeSort(order.order_items || [])
    const split = splitAtMedian(sortedItems, splitThreshold)

    if (!split) {
      return res.status(400).json({ error: 'Order voldoet niet aan de split-drempel of kan niet gesplitst worden' })
    }

    const { data: sub1, error: sub1Err } = await supabase
      .from('sub_orders')
      .insert({ parent_order_id: order.id, sequence_number: 1, status: 'pending' })
      .select().single()
    if (sub1Err) return res.status(500).json({ error: 'Sub-order aanmaken mislukt' })

    const { data: sub2, error: sub2Err } = await supabase
      .from('sub_orders')
      .insert({ parent_order_id: order.id, sequence_number: 2, status: 'pending' })
      .select().single()
    if (sub2Err) return res.status(500).json({ error: 'Sub-order aanmaken mislukt' })

    await supabase.from('sub_order_items').insert(
      split.sub1.map(item => ({ sub_order_id: sub1.id, order_item_id: item.id }))
    )
    await supabase.from('sub_order_items').insert(
      split.sub2.map(item => ({ sub_order_id: sub2.id, order_item_id: item.id }))
    )

    for (const [subOrder, items] of [[sub1, split.sub1], [sub2, split.sub2]]) {
      const boxPlan = packBoxes(items, { targetWeightGrams: targetWeight })
      for (const box of boxPlan) {
        const { data: createdBox } = await supabase
          .from('boxes')
          .insert({ order_id: order.id, sub_order_id: subOrder.id, sequence_number: box.sequence_number, weight_grams: box.weight_grams })
          .select().single()
        if (createdBox && box.items.length > 0) {
          await supabase.from('box_items').insert(
            box.items.map(bi => ({ box_id: createdBox.id, order_item_id: bi.order_item_id, quantity: bi.quantity }))
          )
        }
      }
    }

    await supabase.from('orders').update({ status: 'split', locked_by: null }).eq('id', order.id)

    await supabase.from('events').insert({
      type: 'order_split',
      operator: operator || null,
      order_id: order.id,
      payload: { sub1_id: sub1.id, sub2_id: sub2.id },
    })

    res.json({
      sub_order_1: { ...sub1, item_count: split.sub1.reduce((s, i) => s + i.quantity, 0) },
      sub_order_2: { ...sub2, item_count: split.sub2.reduce((s, i) => s + i.quantity, 0) },
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
