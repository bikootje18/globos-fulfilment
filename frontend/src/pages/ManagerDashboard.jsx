import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import CsvUpload from '../components/CsvUpload.jsx'

export default function ManagerDashboard({ manager, onLogout }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    loadDashboard()
    const id = setInterval(() => loadDashboard(true), 30000)
    return () => clearInterval(id)
  }, [])

  async function loadDashboard(silent = false) {
    if (!silent) setLoading(true)
    try {
      const [dash, set] = await Promise.all([api.getDashboard(), api.getSettings()])
      setData(dash)
      setSettings(set)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleGenerateTest(size) {
    setGenerating(true)
    try {
      await api.generateTestOrder(size)
      await loadDashboard()
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteTests() {
    if (!confirm('Alle testorders verwijderen?')) return
    setDeleting(true)
    try {
      const result = await api.deleteTestOrders()
      alert(`${result.deleted} testorder(s) verwijderd`)
      await loadDashboard()
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveSetting(key, value) {
    const updated = await api.updateSettings({ [key]: value })
    setSettings(updated)
  }

  const fmtTime = ms => {
    if (!ms) return '—'
    const mins = Math.round(ms / 60000)
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}u ${mins % 60}min`
  }

  return (
    <div style={s.app}>
      <div style={s.topbar}>
        <span style={s.title}>Manager-dashboard</span>
        <div style={s.topRight}>
          <button style={s.refreshBtn} onClick={() => loadDashboard()}>Vernieuwen</button>
          <span style={s.badge}>Manager</span>
          <button style={s.logoutBtn} onClick={onLogout}>Uitloggen</button>
        </div>
      </div>

      <div style={s.content}>
        {loading ? (
          <p style={s.empty}>Laden...</p>
        ) : (
          <>
            <Section title="Vandaag">
              <div style={s.statsGrid}>
                <Stat label="Totaal" value={data.today.total} />
                <Stat label="Open" value={data.today.open} />
                <Stat label="Bezig" value={data.today.inProgress} />
                <Stat label="Klaar" value={data.today.completed} />
              </div>
              {data.today.avgPickTimeMs && (
                <p style={s.subStat}>Gemiddelde picktijd: {fmtTime(data.today.avgPickTimeMs)}</p>
              )}
            </Section>

            {data.operatorRanking.length > 0 && (
              <Section title="Operators vandaag">
                {data.operatorRanking.map((op, i) => (
                  <div key={op.name} style={s.rankRow}>
                    <span style={s.rankNum}>#{i + 1}</span>
                    <span style={s.rankName}>{op.name}</span>
                    <span style={s.rankVal}>{op.orders} orders</span>
                  </div>
                ))}
              </Section>
            )}

            {data.oosEvents.length > 0 && (
              <Section title={`Ontbrekende artikelen (${data.oosEvents.length})`}>
                {data.oosEvents.map(e => (
                  <div key={e.id} style={s.oosRow}>
                    <span style={s.oosProduct}>{e.payload.product_name || e.payload.product_id}</span>
                    <span style={s.oosLoc}>{e.payload.location}</span>
                    <span style={s.oosQty}>x{e.payload.quantity}</span>
                    <span style={s.oosOp}>{e.operator}</span>
                  </div>
                ))}
              </Section>
            )}

            {data.topProducts.length > 0 && (
              <Section title="Top 10 producten vandaag">
                {data.topProducts.map((p, i) => (
                  <div key={i} style={s.rankRow}>
                    <span style={s.rankNum}>#{i + 1}</span>
                    <span style={s.rankName}>{p.product?.name || '—'}</span>
                    <span style={s.rankVal}>{p.count}×</span>
                  </div>
                ))}
              </Section>
            )}

            <Section title="Orders importeren">
              <CsvUpload onImported={loadDashboard} />
            </Section>

            <Section title="Testorders">
              <div style={s.testGrid}>
                {['small', 'medium', 'large', 'xl'].map(size => (
                  <button key={size} style={s.testBtn} disabled={generating}
                    onClick={() => handleGenerateTest(size)}>
                    {size === 'small' && 'Klein (5–15)'}
                    {size === 'medium' && 'Middel (20–40)'}
                    {size === 'large' && 'Groot (50–100)'}
                    {size === 'xl' && 'XL (200+)'}
                  </button>
                ))}
              </div>
              <button style={s.deleteBtn} disabled={deleting} onClick={handleDeleteTests}>
                {deleting ? 'Bezig...' : 'Verwijder alle testorders'}
              </button>
            </Section>

            <Section title="Instellingen">
              <button style={s.settingsToggle} onClick={() => setShowSettings(v => !v)}>
                {showSettings ? 'Verbergen' : 'Toon instellingen'}
              </button>
              {showSettings && settings && (
                <div style={s.settingsForm}>
                  <SettingRow label="Split-drempel (items)" settingKey="split_threshold"
                    value={settings.split_threshold} onSave={handleSaveSetting} />
                  <SettingRow label="Doos target gewicht (gram)" settingKey="box_target_weight_grams"
                    value={settings.box_target_weight_grams} onSave={handleSaveSetting} />
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={sec.wrap}>
      <h2 style={sec.title}>{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={sec.stat}>
      <span style={sec.statVal}>{value}</span>
      <span style={sec.statLabel}>{label}</span>
    </div>
  )
}

function SettingRow({ label, settingKey, value, onSave }) {
  const [val, setVal] = useState(value)
  return (
    <div style={sec.settingRow}>
      <label style={sec.settingLabel}>{label}</label>
      <input style={sec.settingInput} value={val} onChange={e => setVal(e.target.value)} />
      <button style={sec.settingSave} onClick={() => onSave(settingKey, val)}>Opslaan</button>
    </div>
  )
}

const s = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f4f0' },
  topbar: { background: '#1a1a18', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: '16px', fontWeight: '500', color: '#fff' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  badge: { fontSize: '12px', background: '#333', color: '#ccc', padding: '3px 10px', borderRadius: '12px' },
  refreshBtn: { fontSize: '12px', color: '#ccc', border: '0.5px solid #444', background: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' },
  logoutBtn: { fontSize: '12px', color: '#999', border: 'none', background: 'none', cursor: 'pointer' },
  content: { padding: '16px', maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' },
  empty: { textAlign: 'center', color: '#999', padding: '40px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
  subStat: { fontSize: '13px', color: '#666', marginTop: '6px' },
  rankRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid #e8e8e4' },
  rankNum: { fontSize: '12px', color: '#aaa', width: '24px' },
  rankName: { flex: 1, fontSize: '14px', color: '#1a1a18' },
  rankVal: { fontSize: '13px', color: '#666' },
  oosRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid #e8e8e4' },
  oosProduct: { flex: 1, fontSize: '13px', color: '#1a1a18' },
  oosLoc: { fontSize: '12px', color: '#888', background: '#f0efe8', padding: '2px 6px', borderRadius: '5px' },
  oosQty: { fontSize: '12px', color: '#d93025', fontWeight: '500' },
  oosOp: { fontSize: '12px', color: '#aaa' },
  testGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' },
  testBtn: { padding: '10px', borderRadius: '8px', border: '0.5px solid #e0dfd8', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#333' },
  deleteBtn: { fontSize: '13px', color: '#d93025', border: '0.5px solid #fca5a5', background: '#fef2f2', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' },
  settingsToggle: { fontSize: '13px', color: '#555', border: '0.5px solid #ccc', background: '#fafaf8', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' },
  settingsForm: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' },
}

const sec = {
  wrap: { background: '#fff', borderRadius: '12px', border: '0.5px solid #e0dfd8', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '13px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8f8f5', borderRadius: '8px', padding: '14px 8px', gap: '4px' },
  statVal: { fontSize: '28px', fontWeight: '600', color: '#1a1a18', lineHeight: 1 },
  statLabel: { fontSize: '11px', color: '#888' },
  settingRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  settingLabel: { fontSize: '13px', color: '#555', flex: 1 },
  settingInput: { width: '100px', height: '34px', padding: '0 10px', borderRadius: '6px', border: '0.5px solid #ccc', fontSize: '13px' },
  settingSave: { fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#1a1a18', color: '#fff', cursor: 'pointer' },
}
