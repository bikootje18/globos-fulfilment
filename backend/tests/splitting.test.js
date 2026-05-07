import { describe, it, expect } from 'vitest'
import { splitAtMedian } from '../src/lib/splitting.js'

describe('splitAtMedian', () => {
  it('returns null when total quantity equals threshold', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i, quantity: 1 }))
    expect(splitAtMedian(items, 50)).toBeNull()
  })

  it('returns null when total quantity is below threshold', () => {
    const items = [{ id: 1, quantity: 10 }]
    expect(splitAtMedian(items, 50)).toBeNull()
  })

  it('splits 80 items into two roughly equal halves', () => {
    const items = Array.from({ length: 80 }, (_, i) => ({ id: i, quantity: 1 }))
    const result = splitAtMedian(items, 50)
    expect(result).not.toBeNull()
    const q1 = result.sub1.reduce((s, i) => s + i.quantity, 0)
    const q2 = result.sub2.reduce((s, i) => s + i.quantity, 0)
    expect(q1 + q2).toBe(80)
    expect(Math.abs(q1 - q2)).toBeLessThanOrEqual(1)
  })

  it('sub1 and sub2 together contain all original items', () => {
    const items = [
      { id: 1, quantity: 30 },
      { id: 2, quantity: 30 },
    ]
    const result = splitAtMedian(items, 50)
    const allIds = [...result.sub1, ...result.sub2].map(i => i.id).sort()
    expect(allIds).toEqual([1, 2])
  })

  it('uses the provided threshold, not a hardcoded 50', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: i, quantity: 1 }))
    expect(splitAtMedian(items, 25)).not.toBeNull()
    expect(splitAtMedian(items, 50)).toBeNull()
  })
})
