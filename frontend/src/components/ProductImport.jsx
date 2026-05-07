import { useState, useRef } from 'react'
import { api } from '../lib/api.js'

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Detect separator: semicolon or comma
  const sep = lines[0].includes(';') ? ';' : ','

  // Strip BOM and parse header
  const header = lines[0].replace(/^﻿/, '').split(sep).map(h =>
    h.trim().replace(/^"|"$/g, '').toLowerCase()
  )

  const colArticle = header.findIndex(h => h.includes('artikelnummer') || h === 'sku')
  const colName    = header.findIndex(h => h.includes('artikelnaam') || h === 'name')
  const colLoc     = header.findIndex(h => h.includes('locatie') || h === 'location')

  if (colArticle === -1 || colName === -1) return null // signal bad format

  const products = []
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue
    const cols = raw.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    const sku  = cols[colArticle]?.trim()
    const name = cols[colName]?.trim()
    if (!sku || !name) continue
    products.push({ sku, name, location: colLoc >= 0 ? cols[colLoc]?.trim() || null : null })
  }
  return products
}

export default function ProductImport({ onImported }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null) // { products, fileName }
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  function readFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setError('Selecteer een .csv bestand')
      return
    }
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const products = parseCsv(e.target.result)
      if (products === null) {
        setError('CSV-formaat niet herkend. Verwacht: Artikelnummer, Artikelnaam, Artikel locatie')
        return
      }
      if (products.length === 0) {
        setError('Geen geldige productrijen gevonden in het bestand')
        return
      }
      setPreview({ products, fileName: file.name })
    }
    reader.readAsText(file, 'utf-8')
  }

  async function doImport() {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.importProducts(preview.products)
      setResult(data)
      setPreview(null)
      if (onImported) setTimeout(() => onImported(), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (preview) {
    return (
      <div style={s.wrap}>
        <div style={s.previewBox}>
          <span style={s.previewIcon}>📋</span>
          <div style={s.previewText}>
            <strong>{preview.fileName}</strong>
            <span style={s.previewCount}>{preview.products.length} producten gevonden</span>
          </div>
        </div>
        <div style={s.previewActions}>
          <button style={s.importBtn} onClick={doImport} disabled={loading}>
            {loading ? 'Importeren...' : `Importeer ${preview.products.length} producten`}
          </button>
          <button style={s.cancelBtn} onClick={() => setPreview(null)} disabled={loading}>
            Annuleren
          </button>
        </div>
        {error && <p style={s.error}>{error}</p>}
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div
        style={{ ...s.zone, ...(dragging ? s.zoneActive : {}) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current?.click()}
      >
        <span style={s.icon}>📦</span>
        <p style={s.hint}>Sleep Locaties.csv hier of klik om te kiezen</p>
        <p style={s.sub}>Kolommen: Artikelnummer, Artikelnaam, Artikel locatie</p>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => readFile(e.target.files[0])} />
      </div>
      {error && <p style={s.error}>{error}</p>}
      {result && (
        <p style={s.ok}>{result.imported} producten geïmporteerd</p>
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
  previewBox: { display: 'flex', alignItems: 'center', gap: '10px', background: '#f4f9f4', border: '0.5px solid #b6ddb6', borderRadius: '8px', padding: '12px 14px' },
  previewIcon: { fontSize: '20px' },
  previewText: { display: 'flex', flexDirection: 'column', gap: '2px' },
  previewCount: { fontSize: '12px', color: '#666' },
  previewActions: { display: 'flex', gap: '8px' },
  importBtn: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1a1a18', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  cancelBtn: { padding: '10px 16px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer' },
  error: { fontSize: '13px', color: '#d93025', margin: 0 },
  ok: { fontSize: '13px', color: '#1d9e75', margin: 0 },
}
