import { Router } from 'express'
import bcrypt from 'bcrypt'
import { supabase } from '../supabase.js'

const router = Router()

// POST /api/auth/verify-manager-pin
// Body: { pin: '1234' }
router.post('/verify-manager-pin', async (req, res) => {
  const { pin } = req.body
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN moet 4 cijfers zijn' })
  }

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'manager_pin_hash')
    .single()

  if (!setting) {
    return res.status(503).json({ error: 'Manager PIN is nog niet ingesteld' })
  }

  const valid = await bcrypt.compare(pin, setting.value)
  if (!valid) return res.status(401).json({ error: 'Onjuiste PIN' })

  res.json({ ok: true, role: 'manager' })
})

// POST /api/auth/set-manager-pin  (one-time setup endpoint)
// Body: { pin: '1234' }
router.post('/set-manager-pin', async (req, res) => {
  const { pin } = req.body
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN moet exact 4 cijfers zijn' })
  }
  const hash = await bcrypt.hash(pin, 10)
  await supabase.from('settings').upsert({ key: 'manager_pin_hash', value: hash })
  res.json({ ok: true })
})

export default router
