import { useState } from 'react'
import { useScanInput } from '../hooks/useScanInput.js'
import { api } from '../lib/api.js'

export default function IncomingMode({ operator }) {
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleScan(barcode) {
    setError(null)
    try {
      const result = await api.processScan(barcode, null, operator, 'incoming')
      setLastResult(result)
    } catch (e) {
      setError(e.message)
      setLastResult(null)
    }
  }

  const { inputRef, handleKeyDown } = useScanInput(handleScan)

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 20
    }}>
      {/* Hidden always-focused input to capture scanner */}
      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        readOnly
      />

      <p style={{ fontSize: 16, color: '#888' }}>
        Point scanner at product and pull trigger
      </p>

      {lastResult && (
        <div style={{
          background: '#E1F5EE', border: '1px solid #5DCAA5',
          borderRadius: 12, padding: '16px 24px', textAlign: 'center', minWidth: 260
        }}>
          <div style={{ fontWeight: 500, fontSize: 16, color: '#0F6E56' }}>
            {lastResult.product.name}
          </div>
          <div style={{ fontSize: 13, color: '#1D9E75', marginTop: 4 }}>
            Stock now: {lastResult.product.stock}
          </div>
          <div style={{ fontSize: 12, color: '#5DCAA5', marginTop: 2 }}>
            Location: {lastResult.product.location || '—'}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: '#FCEBEB', border: '1px solid #F09595',
          borderRadius: 12, padding: '16px 24px', color: '#A32D2D',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
