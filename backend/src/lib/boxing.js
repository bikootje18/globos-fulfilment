export function packBoxes(orderItems, {
  targetWeightGrams = 28000,
} = {}) {
  const units = []
  for (const item of orderItems) {
    const w = item.product?.weight_grams ?? 0
    for (let i = 0; i < item.quantity; i++) {
      units.push({ order_item_id: item.id, weight_grams: w })
    }
  }

  units.sort((a, b) => b.weight_grams - a.weight_grams)

  const bins = []
  for (const unit of units) {
    let placed = false
    for (const bin of bins) {
      if (bin.total + unit.weight_grams <= targetWeightGrams) {
        bin.units.push(unit)
        bin.total += unit.weight_grams
        placed = true
        break
      }
    }
    if (!placed) bins.push({ total: unit.weight_grams, units: [unit] })
  }

  return bins.map((bin, idx) => ({
    sequence_number: idx + 1,
    weight_grams: bin.total,
    items: collapseUnits(bin.units),
  }))
}

function collapseUnits(units) {
  const map = new Map()
  for (const u of units) {
    const existing = map.get(u.order_item_id)
    if (existing) existing.quantity++
    else map.set(u.order_item_id, { order_item_id: u.order_item_id, quantity: 1 })
  }
  return [...map.values()]
}
