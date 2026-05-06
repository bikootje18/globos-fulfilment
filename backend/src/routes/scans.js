import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// POST /api/scans — process a barcode scan
// Body: { barcode, order_id, operator, mode: 'outgoing'|'incoming' }
router.post('/', async (req, res) => {
  try {
    const { barcode, order_id, operator, mode } = req.body
    if (!barcode || !operator || !mode) {
      return res.status(400).json({ error: 'barcode, operator en mode zijn verplicht' })
    }

    const { data: product, error: productError } = await supabase
      .from('products').select('*').eq('barcode', barcode).single()
    if (productError) {
      return res.status(404).json({ error: 'Onbekende barcode', barcode })
    }

    // Measure time since last scan for timing analytics
    let timeSincePrevious = null
    if (order_id) {
      const { data: prev } = await supabase
        .from('scan_log')
        .select('scanned_at')
        .eq('order_id', order_id)
        .eq('operator', operator)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .single()
      if (prev) timeSincePrevious = Date.now() - new Date(prev.scanned_at).getTime()
    }

    await supabase.from('scan_log').insert({
      barcode,
      product_id: product.id,
      order_id: order_id || null,
      operator,
      mode,
      time_since_previous_event_ms: timeSincePrevious,
      event_type: 'scan',
    })

    if (mode === 'outgoing' && order_id) {
      const { data: item, error: itemError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order_id)
        .eq('product_id', product.id)
        .single()

      if (itemError) {
        return res.status(404).json({ error: 'Product staat niet op deze order', product, result: 'unexpected_item' })
      }

      const newQty = item.scanned_quantity + 1
      await supabase.from('order_items').update({ scanned_quantity: newQty }).eq('id', item.id)

      if (newQty > item.quantity) {
        return res.json({ result: 'over_pick', product, item: { ...item, scanned_quantity: newQty } })
      }

      const complete = newQty >= item.quantity
      return res.json({
        result: complete ? 'item_complete' : 'item_progress',
        product,
        item: { ...item, scanned_quantity: newQty },
      })
    }

    if (mode === 'incoming') {
      const { data: updated } = await supabase
        .from('products').update({ stock: (product.stock || 0) + 1 }).eq('id', product.id).select().single()
      return res.json({ result: 'stock_updated', product: updated })
    }

    res.json({ result: 'ok', product })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/scans/oos — flag an order item as out-of-stock
// Body: { order_item_id, order_id, operator, quantity? }
router.post('/oos', async (req, res) => {
  try {
    const { order_item_id, order_id, operator, quantity } = req.body
    if (!order_item_id || !operator) {
      return res.status(400).json({ error: 'order_item_id en operator zijn verplicht' })
    }

    const { data: item, error } = await supabase
      .from('order_items').select('*, product:products(*)').eq('id', order_item_id).single()
    if (error) return res.status(404).json({ error: 'Item niet gevonden' })

    const oosQty = quantity ?? Math.max(0, item.quantity - item.scanned_quantity - item.out_of_stock_quantity)
    const { data: updated, error: updateError } = await supabase
      .from('order_items')
      .update({ out_of_stock_quantity: item.out_of_stock_quantity + oosQty })
      .eq('id', order_item_id)
      .select()
      .single()

    if (updateError) return res.status(500).json({ error: 'Update mislukt' })

    await supabase.from('events').insert({
      type: 'out_of_stock_flag',
      operator,
      order_id: order_id || null,
      payload: {
        product_id: item.product_id,
        product_name: item.product?.name,
        location: item.product?.location,
        quantity: oosQty,
      },
    })

    res.json({ result: 'oos_flagged', item: updated })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
