import { Router } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import { supabase } from '../supabase.js'
import { snakeSort } from '../lib/routing.js'
import { packBoxes } from '../lib/boxing.js'
import { splitAtMedian } from '../lib/splitting.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// POST /api/upload/orders
// multipart/form-data, field name: "file"
router.post('/orders', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand ontvangen' })

  const text = req.file.buffer.toString('utf8')
  let rows
  try {
    rows = parse(text, { columns: true, skip_empty_lines: true, delimiter: ';', trim: true })
  } catch (err) {
    return res.status(400).json({ error: 'CSV-parseerfout', detail: err.message })
  }

  const col = {
    ref:      r => r['Order-ref']    || r['order_ref']    || r['Ordernummer'],
    sku:      r => r['Artikelnummer'] || r['artikelnummer'] || r['SKU'],
    qty:      r => r['Aantal']        || r['aantal']        || r['Quantity'],
    customer: r => r['Klant']         || r['klant']         || r['Customer'] || '',
  }

  const orderMap = new Map()
  for (const row of rows) {
    const ref = col.ref(row)?.trim()
    const sku = col.sku(row)?.trim()
    const qty = parseInt(col.qty(row)) || 1
    const customer = col.customer(row)?.trim()
    if (!ref || !sku) continue
    if (!orderMap.has(ref)) orderMap.set(ref, { customer, lines: [] })
    orderMap.get(ref).lines.push({ sku, quantity: qty })
  }

  if (orderMap.size === 0) {
    return res.status(400).json({ error: 'Geen geldige orders gevonden in CSV' })
  }

  const { data: settingsRows } = await supabase.from('settings').select('key, value')
  const settings = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]))
  const splitThreshold = parseInt(settings.split_threshold) || 50
  const targetWeight = parseInt(settings.box_target_weight_grams) || 28000

  const imported = []
  const errors = []

  for (const [ref, { customer, lines }] of orderMap.entries()) {
    const { data: existing } = await supabase
      .from('orders').select('id').eq('reference', ref).single()
    if (existing) { errors.push({ ref, error: 'Order bestaat al' }); continue }

    const skus = [...new Set(lines.map(l => l.sku))]
    const { data: products } = await supabase.from('products').select('*').in('sku', skus)
    const bySku = Object.fromEntries((products || []).map(p => [p.sku, p]))

    const totalWeightGrams = lines.reduce((s, l) =>
      s + (bySku[l.sku]?.weight_grams ?? 0) * l.quantity, 0)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ reference: ref, customer_name: customer, status: 'pending', total_weight_grams: totalWeightGrams })
      .select().single()
    if (orderErr) { errors.push({ ref, error: orderErr.message }); continue }

    const itemsToInsert = lines
      .filter(l => bySku[l.sku])
      .map(l => ({ order_id: order.id, product_id: bySku[l.sku].id, quantity: l.quantity }))

    const { data: createdItems } = await supabase
      .from('order_items').insert(itemsToInsert).select('*, product:products(*)')

    const sorted = snakeSort(createdItems || [])
    const boxPlan = packBoxes(sorted, { targetWeightGrams: targetWeight })

    for (const box of boxPlan) {
      const { data: createdBox } = await supabase
        .from('boxes')
        .insert({ order_id: order.id, sequence_number: box.sequence_number, weight_grams: box.weight_grams })
        .select().single()
      if (createdBox && box.items.length > 0) {
        await supabase.from('box_items').insert(
          box.items.map(bi => ({ box_id: createdBox.id, order_item_id: bi.order_item_id, quantity: bi.quantity }))
        )
      }
    }

    await supabase.from('orders')
      .update({ expected_box_count: boxPlan.length })
      .eq('id', order.id)

    const totalQty = lines.reduce((s, l) => s + l.quantity, 0)
    const splitSuggested = splitAtMedian(sorted, splitThreshold) !== null

    await supabase.from('events').insert({
      type: 'order_imported',
      order_id: order.id,
      payload: { ref, items_count: itemsToInsert.length, total_quantity: totalQty, source: 'csv' },
    })

    imported.push({
      ref,
      order_id: order.id,
      items_count: itemsToInsert.length,
      total_quantity: totalQty,
      boxes: boxPlan.length,
      split_suggested: splitSuggested,
    })
  }

  res.json({ imported: imported.length, errors: errors.length, orders: imported, parse_errors: errors })
})

export default router
