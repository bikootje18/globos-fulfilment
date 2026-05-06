import { useState, useRef } from 'react'
import { api } from '../lib/api.js'

export default function CsvUpload({ onImported }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  async function processFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setError('Selecteer een .csv bestand')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.uploadOrders(file)
      setResult(data)
      if (onImported) setTimeout(() => onImported(), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      <div
        style={{ ...s.zone, ...(dragging ? s.zoneActive : {}) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
        onClick={() => !loading && fileRef.current?.click()}
      >
        {loading ? (
          <p style={s.hint}>Bezig met importeren...</p>
        ) : (
          <>
            <span style={s.icon}>📂</span>
            <p style={s.hint}>Sleep CSV hier of klik om te kiezen</p>
            <p style={s.sub}>Kolommen: Artikelnummer; Aantal; Klant; Order-ref</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => processFile(e.target.files[0])} />
      </div>
      {error && <p style={s.error}>{error}</p>}
      {result && (
        <p style={s.ok}>
          {result.imported} order{result.imported !== 1 ? 's' : ''} geïmporteerd
          {result.errors > 0 && ` · ${result.errors} fouten`}
        </p>
      )}
    </div>
  )
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '8px' },
  zone: { border: '1.5px dashed #ccc', borderRadius: '10px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: '#fafaf8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  zoneActive: { borderColor: '#378add', background: '#f0f6fd' },
  icon: { fontSize: '24px' },
  hint: { fontSize: '13px', color: '#555', margin: 0 },
  sub: { fontSize: '11px', color: '#aaa', margin: 0 },
  error: { fontSize: '13px', color: '#d93025', margin: 0 },
  ok: { fontSize: '13px', color: '#1d9e75', margin: 0 },
}
