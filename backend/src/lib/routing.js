export function snakeSort(items) {
  return [...items].sort((a, b) => {
    const colA = a.product?.column_position ?? 9999
    const colB = b.product?.column_position ?? 9999
    if (colA !== colB) return colA - colB
    const sideA = a.product?.column_side === 'Z' ? 1 : 0
    const sideB = b.product?.column_side === 'Z' ? 1 : 0
    return sideA - sideB
  })
}
