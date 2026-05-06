import { describe, it, expect } from 'vitest'
import { snakeSort } from '../src/lib/routing.js'

describe('snakeSort', () => {
  it('sorts by column_position ascending', () => {
    const items = [
      { product: { column_position: 11, column_side: 'N' } },
      { product: { column_position: 1,  column_side: 'N' } },
    ]
    const result = snakeSort(items)
    expect(result[0].product.column_position).toBe(1)
    expect(result[1].product.column_position).toBe(11)
  })

  it('within same column, N side comes before Z side', () => {
    const items = [
      { product: { column_position: 11, column_side: 'Z' } },
      { product: { column_position: 11, column_side: 'N' } },
    ]
    const result = snakeSort(items)
    expect(result[0].product.column_side).toBe('N')
    expect(result[1].product.column_side).toBe('Z')
  })

  it('items without column_position go to the end', () => {
    const items = [
      { product: { column_position: null } },
      { product: { column_position: 5, column_side: 'N' } },
    ]
    const result = snakeSort(items)
    expect(result[0].product.column_position).toBe(5)
    expect(result[1].product.column_position).toBeNull()
  })

  it('matches design example: S1(col1,N), S44(col1,Z), S22(col11,N), S24(col11,Z)', () => {
    const items = [
      { id: 'S22', product: { column_position: 11, column_side: 'N' } },
      { id: 'S24', product: { column_position: 11, column_side: 'Z' } },
      { id: 'S44', product: { column_position: 1,  column_side: 'Z' } },
      { id: 'S1',  product: { column_position: 1,  column_side: 'N' } },
    ]
    const result = snakeSort(items)
    expect(result.map(i => i.id)).toEqual(['S1', 'S44', 'S22', 'S24'])
  })

  it('does not mutate the original array', () => {
    const items = [
      { product: { column_position: 5, column_side: 'N' } },
      { product: { column_position: 1, column_side: 'N' } },
    ]
    const first = items[0]
    snakeSort(items)
    expect(items[0]).toBe(first)
  })
})
