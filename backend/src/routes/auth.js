import { Router } from 'express'
import bcrypt from 'bcrypt'
import { supabase } from '../supabase.js'

const router = Router()

// POST /api/auth/verify-manager-pin
// Body: { pin: '1234' }
router.post('/verify-manager-pin', async (req, res) => {
  try {
    const { pin } = req.body
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN moet 4 cijfers zijn' })
    }

    const { data: setting, error: dbError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'manager_pin_hash')
      .single()

    if (dbError) return res.status(500).json({ error: 'Database error' })
    if (!setting) return res.status(503).json({ error: 'Manager PIN is nog niet ingesteld' })

    const valid = await bcrypt.compare(pin, setting.value)
    if (!valid) return res.status(401).json({ error: 'Onjuiste PIN' })

    res.json({ ok: true, role: 'manager' })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/auth/set-manager-pin  (one-time setup endpoint)
// Body: { pin: '1234' }
router.post('/set-manager-pin', async (req, res) => {
  try {
    const { pin } = req.body
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN moet 4 cijfers zijn' })
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'manager_pin_hash')
      .single()

    if (existing) {
      return res.status(409).json({ error: 'PIN is al ingesteld. Gebruik reset om te wijzigen.' })
    }

    const hash = await bcrypt.hash(pin, 10)
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({ key: 'manager_pin_hash', value: hash })

    if (upsertError) return res.status(500).json({ error: 'Opslaan mislukt' })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
