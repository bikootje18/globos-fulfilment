import { useState } from 'react'
import { api } from '../lib/api.js'

export default function OrderDetail({ order, operator, onClose, onComplete, onSplit }) {
  const items = order.order_items || []
  const boxes = (order.boxes || []).slice().sort((a, b) => a.sequence_number - b.sequence_number)
  const [currentBoxIdx, setCurrentBoxIdx] = useState(0)
  const [showSplitConfirm, setShowSplitConfirm] = useState(order.split_suggested && !order.sub_orders?.length)
  const [splitting, setSplitting] = useState(false)
  const [blockError, setBlockError] = useState(null)

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const scannedQty = items.reduce((s, i) => s + i.scanned_quantity, 0)

  async function handleComplete() {
    setBlockError(null)
    try {
      await api.completeOrder(order.id, operator)
      onComplete()
    } catch (err) {
      setBlockError(err.message)
    }
  }

  async function handleSplit() {
    setSplitting(true)
    try {
      await api.splitOrder(order.id, operator)
      setShowSplitConfirm(false)
      if (onSplit) onSplit()
      onClose()
    } catch (err) {
      setBlockError(err.message)
    } finally {
      setSplitting(false)
    }
  }

  async function handleOos(item) {
    await api.flagOos(item.id, order.id, operator)
  }

  const useBoxMode = boxes.length > 0
  const currentBox = useBoxMode ? boxes[currentBoxIdx] : null
  const itemById = Object.fromEntries(items.map(i => [i.id, i]))
  const boxItems = currentBox
    ? (currentBox.box_items || []).map(bi => ({ ...itemById[bi.order_item_id], box_quantity: bi.quantity }))
    : items

  const allDone = items.every(i => i.scanned_quantity + (i.out_of_stock_quantity || 0) >= i.quantity)

  return (
    <div style={s.wrap}>
      {showSplitConfirm && (
        <div style={s.splitBanner}>
          <div style={s.splitText}>
            <strong>Deze order heeft {totalQty} items.</strong>
            <span>Splitsen in 2 delen zodat twee operators tegelijk kunnen picken?</span>
          </div>
          <div style={s.splitActions}>
            <button style={s.splitYes} onClick={handleSplit} disabled={splitting}>
              {splitting ? 'Bezig...' : 'Ja, splitsen'}
            </button>
            <button style={s.splitNo} onClick={() => setShowSplitConfirm(false)}>
              Nee, zelf doen
            </button>
          </div>
        </div>
      )}

      <div style={s.header}>
        <button style={s.backBtn} onClick={onClose}>← Terug</button>
        <div style={s.headerInfo}>
          <span style={s.ref}>{order.reference}</span>
          <span style={s.customer}>{order.customer_name}</span>
        </div>
        <span style={s.progress}>{scannedQty}/{totalQty}</span>
      </div>

      <div style={s.progressWrap}>
        <div style={s.progressBar}>
          <div style={{
            ...s.progressFill,
            width: `${totalQty > 0 ? Math.round((scannedQty / totalQty) * 100) : 0}%`
          }} />
        </div>
      </div>

      {useBoxMode && (
        <div style={s.boxNav}>
          <span style={s.boxLabel}>
            Doos {currentBoxIdx + 1} van {boxes.length}
            <span style={s.boxWeight}> · ~{Math.round(currentBox.weight_grams / 1000 * 10) / 10} kg</span>
          </span>
          <div style={s.boxBtns}>
            <button style={s.boxBtn} disabled={currentBoxIdx === 0}
              onClick={() => setCurrentBoxIdx(i => i - 1)}>← Vorige</button>
            <button style={s.boxBtn} disabled={currentBoxIdx === boxes.length - 1}
              onClick={() => setCurrentBoxIdx(i => i + 1)}>Volgende →</button>
          </div>
        </div>
      )}

      {allDone && (
        <div style={s.completeBanner}>
          <div style={s.completeIcon}>✓</div>
          <div style={s.completeText}>
            <strong>Order klaar</strong>
            <span>Alle items gescand of ontbrekend gemeld</span>
          </div>
          <button style={s.completeBtn} onClick={handleComplete}>Bevestig verzending</button>
        </div>
      )}

      {blockError && (
        <div style={s.blockError}>{blockError}</div>
      )}

      <div style={s.table}>
        <div style={s.tableHead}>
          <span style={{ flex: 3 }}>Product</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Locatie</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Voortgang</span>
          <span style={{ width: 60 }}></span>
        </div>
        {boxItems.map(item => item && (
          <PickRow key={item.id} item={item} onOos={() => handleOos(item)} />
        ))}
      </div>

      <p style={s.hint}>Scanner actief — druk de trekker in om te scannen</p>
    </div>
  )
}

function PickRow({ item, onOos }) {
  const product = item.product
  const qty = item.box_quantity ?? item.quantity
  const scanned = item.scanned_quantity || 0
  const oos = item.out_of_stock_quantity || 0
  const effective = scanned + oos
  const done = effective >= item.quantity
  const overPick = scanned > item.quantity
  const partial = scanned > 0 && !done && !overPick

  const bg = done ? '#f0faf6' : overPick ? '#fff8e6' : partial ? '#fffbf0' : '#fff'
  const dotColor = done ? '#1d9e75' : overPick ? '#ef9f27' : partial ? '#ef9f27' : '#ccc'

  return (
    <div style={{ ...s.row, background: bg }}>
      <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ ...s.dot, background: dotColor }} />
        <div>
          <div style={s.productName}>{product?.name}</div>
          <div style={s.sku}>{product?.sku}</div>
          {oos > 0 && <div style={s.oosBadge}>Ontbrekend: {oos}</div>}
        </div>
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={s.location}>{product?.location || '—'}</span>
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={{
          ...s.qty,
          color: done ? '#0f6e56' : overPick ? '#854f0b' : partial ? '#854f0b' : '#999',
          fontWeight: done || overPick || partial ? '500' : '400',
        }}>
          {scanned}/{qty}
        </span>
      </div>
      <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
        {!done && (
          <button style={s.oosBtn} onClick={onOos} title="Markeer als ontbrekend">
            OOS
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)' },
  splitBanner: { background: '#fff8f0', borderBottom: '0.5px solid #f4a661', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  splitText: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', color: '#7a3800' },
  splitActions: { display: 'flex', gap: '8px' },
  splitYes: { padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#c45100', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  splitNo: { padding: '7px 16px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', color: '#555', fontSize: '13px', cursor: 'pointer' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', borderBottom: '0.5px solid #e0dfd8' },
  backBtn: { fontSize: '13px', color: '#555', border: 'none', background: 'none', cursor: 'pointer', padding: '4px 0' },
  headerInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  ref: { fontSize: '15px', fontWeight: '500', color: '#1a1a18' },
  customer: { fontSize: '12px', color: '#888' },
  progress: { fontSize: '15px', fontWeight: '500', color: '#378add' },
  progressWrap: { padding: '0 16px', background: '#fff', paddingBottom: '10px' },
  progressBar: { height: '4px', borderRadius: '2px', background: '#e8e8e4', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#378add', transition: 'width 0.3s' },
  boxNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#f8f8f5', borderBottom: '0.5px solid #e8e8e4' },
  boxLabel: { fontSize: '14px', fontWeight: '500', color: '#1a1a18' },
  boxWeight: { fontSize: '12px', color: '#888', fontWeight: '400' },
  boxBtns: { display: 'flex', gap: '8px' },
  boxBtn: { fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', color: '#555' },
  completeBanner: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#e1f5ee', borderBottom: '0.5px solid #5dcaa5' },
  completeIcon: { width: '32px', height: '32px', borderRadius: '50%', background: '#1d9e75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '500', flexShrink: 0 },
  completeText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', color: '#0f6e56' },
  completeBtn: { padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#1d9e75', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 },
  blockError: { padding: '12px 16px', background: '#fef2f2', color: '#991b1b', fontSize: '13px', borderBottom: '0.5px solid #fca5a5' },
  table: { flex: 1, overflow: 'auto' },
  tableHead: { display: 'flex', padding: '8px 16px', fontSize: '11px', color: '#999', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '0.5px solid #e8e8e4', background: '#fafaf8' },
  row: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #e8e8e4' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  productName: { fontSize: '14px', color: '#1a1a18', fontWeight: '400' },
  sku: { fontSize: '12px', color: '#aaa', marginTop: '2px' },
  oosBadge: { fontSize: '11px', color: '#d93025', marginTop: '2px' },
  location: { fontSize: '12px', fontWeight: '500', color: '#555', background: '#f0efe8', padding: '3px 8px', borderRadius: '6px' },
  qty: { fontSize: '14px' },
  oosBtn: { fontSize: '10px', padding: '3px 7px', borderRadius: '5px', border: '0.5px solid #f4a661', background: '#fff8f0', color: '#c45100', cursor: 'pointer', fontWeight: '500' },
  hint: { padding: '12px 16px', fontSize: '12px', color: '#bbb', textAlign: 'center', borderTop: '0.5px solid #e8e8e4' },
}
