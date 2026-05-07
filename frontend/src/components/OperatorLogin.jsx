import { useState } from 'react'
import { api } from '../lib/api.js'

const OPERATORS = ['Kamilla', 'Martina', 'Pampuch', 'Sezar', 'Wessel']

export default function OperatorLogin({ onLogin }) {
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitPin() {
    if (pin.length !== 4) { setPinError('PIN moet 4 cijfers zijn'); return }
    setLoading(true)
    try {
      await api.verifyManagerPin(pin)
      onLogin({ name: 'Manager', role: 'manager' })
    } catch {
      setPinError('Onjuiste PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  if (showPin) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <h1 style={s.title}>Manager-login</h1>
          <p style={s.sub}>Voer je 4-cijferige PIN in</p>
          <input
            style={s.input}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError('') }}
            onKeyDown={e => e.key === 'Enter' && submitPin()}
            autoFocus
            placeholder="••••"
          />
          {pinError && <p style={s.error}>{pinError}</p>}
          <button style={s.btn} onClick={submitPin} disabled={loading || pin.length !== 4}>
            {loading ? 'Bezig...' : 'Inloggen als Manager'}
          </button>
          <button style={s.backLink} onClick={() => { setShowPin(false); setPin(''); setPinError('') }}>
            ← Terug
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1a1a18"/>
            <path d="M8 22L14 10l4 8 3-5 5 9" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <h1 style={s.title}>Fulfillment Scanner</h1>
        <p style={s.sub}>Wie scant er vandaag?</p>
        <div style={s.grid}>
          {OPERATORS.map(op => (
            <button key={op} style={s.opBtn} onClick={() => onLogin({ name: op, role: 'operator' })}>
              <span style={s.initials}>{op.slice(0, 2).toUpperCase()}</span>
              <span style={s.opName}>{op}</span>
            </button>
          ))}
        </div>
        <div style={s.divider}><span style={s.dividerText}>of login als</span></div>
        <button style={s.managerBtn} onClick={() => onLogin({ name: 'Manager', role: 'manager' })}>
          Manager-dashboard
        </button>
      </div>
    </div>
  )
}

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f4f4f0' },
  card: { background: '#fff', borderRadius: '16px', border: '0.5px solid #e0dfd8', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' },
  logo: { display: 'flex', justifyContent: 'center' },
  title: { fontSize: '20px', fontWeight: '500', textAlign: 'center', color: '#1a1a18' },
  sub: { fontSize: '14px', color: '#888', textAlign: 'center', marginTop: '-12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  opBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 8px', border: '0.5px solid #e0dfd8', borderRadius: '10px', background: '#fafaf8', cursor: 'pointer' },
  initials: { width: '36px', height: '36px', borderRadius: '50%', background: '#e8f0fb', color: '#1a5fae', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500' },
  opName: { fontSize: '12px', color: '#444' },
  divider: { display: 'flex', alignItems: 'center' },
  dividerText: { fontSize: '12px', color: '#aaa', flex: '1', textAlign: 'center', borderTop: '0.5px solid #e0dfd8', paddingTop: '10px' },
  managerBtn: { height: '44px', borderRadius: '8px', border: '0.5px solid #e0dfd8', background: '#fafaf8', color: '#555', fontSize: '14px', fontWeight: '400', cursor: 'pointer' },
  input: { height: '52px', padding: '0 16px', borderRadius: '8px', border: '0.5px solid #ccc', fontSize: '20px', letterSpacing: '8px', outline: 'none', textAlign: 'center', background: '#fafaf8' },
  btn: { height: '44px', borderRadius: '8px', border: 'none', background: '#1a1a18', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' },
  backLink: { fontSize: '13px', color: '#999', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' },
  error: { fontSize: '13px', color: '#d93025', textAlign: 'center', marginTop: '-8px' },
}
