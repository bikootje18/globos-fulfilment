import { describe, it, expect } from 'vitest'
import { packBoxes } from '../src/lib/boxing.js'

describe('packBoxes', () => {
  it('puts all items in one box when they fit under target weight', () => {
    const items = [
      { id: 'a', quantity: 2, product: { weight_grams: 500 } },
      { id: 'b', quantity: 1, product: { weight_grams: 1000 } },
    ]
    const boxes = packBoxes(items, { targetWeightGrams: 28000 })
    expect(boxes).toHaveLength(1)
    expect(boxes[0].weight_grams).toBe(2000)
    expect(boxes[0].sequence_number).toBe(1)
  })

  it('splits into two boxes when total exceeds target weight', () => {
    const items = [
      { id: 'a', quantity: 1, product: { weight_grams: 15000 } },
      { id: 'b', quantity: 1, product: { weight_grams: 15000 } },
    ]
    const boxes = packBoxes(items, { targetWeightGrams: 28000 })
    expect(boxes).toHaveLength(2)
    expect(boxes[0].sequence_number).toBe(1)
    expect(boxes[1].sequence_number).toBe(2)
  })

  it('places overflow item in a new box when target would be exceeded', () => {
    const items = [
      { id: 'a', quantity: 1, product: { weight_grams: 14000 } },
      { id: 'b', quantity: 1, product: { weight_grams: 14000 } },
      { id: 'c', quantity: 1, product: { weight_grams: 2000 } },
    ]
    const boxes = packBoxes(items, { targetWeightGrams: 28000 })
    expect(boxes).toHaveLength(2)
    expect(boxes[0].weight_grams).toBe(28000)
    expect(boxes[1].weight_grams).toBe(2000)
  })

  it('collapses multiple units of the same item into one entry', () => {
    const items = [{ id: 'a', quantity: 3, product: { weight_grams: 1000 } }]
    const boxes = packBoxes(items)
    expect(boxes[0].items[0].quantity).toBe(3)
    expect(boxes[0].items[0].order_item_id).toBe('a')
  })

  it('treats null weight as 0 grams (does not throw)', () => {
    const items = [{ id: 'a', quantity: 2, product: { weight_grams: null } }]
    expect(() => packBoxes(items)).not.toThrow()
    expect(packBoxes(items)[0].weight_grams).toBe(0)
  })

  it('returns empty array for empty input', () => {
    expect(packBoxes([])).toEqual([])
  })
})
