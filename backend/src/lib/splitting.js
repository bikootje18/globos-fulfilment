export function splitAtMedian(sortedItems, threshold = 50) {
  const totalQty = sortedItems.reduce((s, i) => s + i.quantity, 0)
  if (totalQty <= threshold) return null

  const half = Math.ceil(totalQty / 2)
  let accumulated = 0
  let splitIndex = sortedItems.length - 1

  for (let i = 0; i < sortedItems.length; i++) {
    accumulated += sortedItems[i].quantity
    if (accumulated >= half) {
      splitIndex = i
      break
    }
  }

  return {
    sub1: sortedItems.slice(0, splitIndex + 1),
    sub2: sortedItems.slice(splitIndex + 1),
  }
}
