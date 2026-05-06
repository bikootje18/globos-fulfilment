import { useState } from 'react'
import CsvUpload from './CsvUpload.jsx'

export default function OrderList({ orders, loading, operator, onSelect, onRefresh }) {
  const [showUpload, setShowUpload] = useState(false)

  if (loading) return <div style={s.empty}>Orders laden...</div>

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>Open orders</span>
        <span style={s.count}>{orders.length}</span>
        <div style={{ flex: 1 }} />
        <button style={s.uploadBtn} onClick={() => setShowUpload(v => !v)}>
          {showUpload ? 'Sluiten' : '+ CSV importeren'}
        </button>
      </div>

      {showUpload && (
        <div style={s.uploadWrap}>
          <CsvUpload onImported={() => { setShowUpload(false); if (onRefresh) onRefresh() }} />
        </div>
      )}

      {orders.length === 0 && !showUpload && (
        <div style={s.empty}>Geen open orders</div>
      )}

      <div style={s.list}>
        {orders.map(order => (
          <OrderCard key={order.id} order={order} operator={operator} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order, operator, onSelect }) {
  const items = order.order_items || []
  const total = items.reduce((s, i) => s + i.quantity, 0)
  const scanned = items.reduce((s, i) => s + i.scanned_quantity, 0)
  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0
  const isLocked = order.locked_by && order.locked_by !== operator
  const isMine = order.locked_by === operator

  return (
    <div
      style={{ ...s.card, ...(isLocked ? s.cardLocked : {}), ...(isMine ? s.cardMine : {}) }}
      onClick={() => !isLocked && onSelect(order)}
    >
      <div style={s.cardTop}>
        <span style={s.ref}>{order.reference}</span>
        {order.is_test && <span style={s.testBadge}>TEST</span>}
        {order.split_suggested && !isLocked && (
          <span style={s.splitBadge}>Splitsen?</span>
        )}
        {isLocked && <span style={s.lockedBadge}>{order.locked_by}</span>}
        {isMine && <span style={s.mineBadge}>Jij</span>}
      </div>
      <div style={s.customer}>{order.customer_name}</div>
      <div style={s.progress}>
        <div style={s.bar}>
          <div style={{ ...s.fill, width: `${pct}%`, background: pct === 100 ? '#1d9e75' : '#378add' }} />
        </div>
        <span style={s.pct}>{scanned}/{total} items</span>
        {order.expected_box_count > 0 && (
          <span style={s.boxBadge}>{order.expected_box_count} doz.</span>
        )}
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: '16px', maxWidth: '600px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  title: { fontSize: '15px', fontWeight: '500', color: '#333' },
  count: { fontSize: '12px', background: '#e0dfd8', color: '#666', padding: '2px 8px', borderRadius: '10px' },
  uploadBtn: { fontSize: '12px', padding: '5px 12px', borderRadius: '8px', border: '0.5px solid #85b7eb', background: '#e6f0fb', color: '#1a5fae', cursor: 'pointer', fontWeight: '500' },
  uploadWrap: { marginBottom: '16px' },
  empty: { padding: '48px', textAlign: 'center', color: '#999', fontSize: '15px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' },
  cardLocked: { opacity: 0.5, cursor: 'not-allowed', background: '#fafaf8' },
  cardMine: { borderColor: '#85b7eb', background: '#f0f6fd' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  ref: { fontSize: '14px', fontWeight: '500', color: '#1a1a18', flex: 1 },
  customer: { fontSize: '13px', color: '#666' },
  testBadge: { fontSize: '10px', padding: '2px 6px', borderRadius: '5px', background: '#fff3cd', color: '#856404', fontWeight: '500' },
  splitBadge: { fontSize: '10px', padding: '2px 6px', borderRadius: '5px', background: '#fff0e6', color: '#c45100', fontWeight: '500' },
  lockedBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#f0efe8', color: '#888' },
  mineBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#e6f0fb', color: '#1a5fae', fontWeight: '500' },
  progress: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' },
  bar: { flex: 1, height: '4px', borderRadius: '2px', background: '#e8e8e4', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: '2px', transition: 'width 0.3s' },
  pct: { fontSize: '12px', color: '#999', whiteSpace: 'nowrap' },
  boxBadge: { fontSize: '11px', color: '#555', background: '#f0efe8', padding: '2px 7px', borderRadius: '5px' },
}
