import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/products — list all products
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/products/barcode/:barcode — look up product by barcode
// This is the key endpoint — called every time the scanner fires
router.get('/barcode/:barcode', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', req.params.barcode)
    .single()

  if (error) return res.status(404).json({ error: 'Product not found' })
  res.json(data)
})

export default router
