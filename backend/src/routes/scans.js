import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// POST /api/scans — process a scan event
// Body: { barcode, order_id, operator, mode: 'outgoing' | 'incoming' }
router.post('/', async (req, res) => {
  const { barcode, order_id, operator, mode } = req.body

  if (!barcode || !operator || !mode) {
    return res.status(400).json({ error: 'barcode, operator and mode are required' })
  }

  // 1. Look up the product by barcode
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (productError) {
    return res.status(404).json({ error: 'Unknown barcode', barcode })
  }

  // 2. Log the scan
  await supabase.from('scan_log').insert({
    barcode,
    product_id: product.id,
    order_id: order_id || null,
    operator,
    mode,
    scanned_at: new Date().toISOString()
  })

  // 3. Handle outgoing — update order item scanned quantity
  if (mode === 'outgoing' && order_id) {
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order_id)
      .eq('product_id', product.id)
      .single()

    if (itemError) {
      return res.status(404).json({
        error: 'Product not on this order',
        product,
        result: 'unexpected_item'
      })
    }

    if (item.scanned_quantity >= item.quantity) {
      return res.json({
        result: 'already_complete',
        product,
        item
      })
    }

    const newQty = item.scanned_quantity + 1
    await supabase
      .from('order_items')
      .update({ scanned_quantity: newQty })
      .eq('id', item.id)

    const complete = newQty >= item.quantity
    return res.json({
      result: complete ? 'item_complete' : 'item_progress',
      product,
      item: { ...item, scanned_quantity: newQty }
    })
  }

  // 4. Handle incoming — increment stock
  if (mode === 'incoming') {
    const { data: updated } = await supabase
      .from('products')
      .update({ stock: (product.stock || 0) + 1 })
      .eq('id', product.id)
      .select()
      .single()

    return res.json({
      result: 'stock_updated',
      product: updated
    })
  }

  res.json({ result: 'ok', product })
})

export default router
