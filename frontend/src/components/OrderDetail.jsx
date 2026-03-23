export default function OrderDetail({ order, operator, onClose, onComplete }) {
  const items = order.order_items || []
  const total = items.reduce((s, i) => s + i.quantity, 0)
  const scanned = items.reduce((s, i) => s + i.scanned_quantity, 0)
  const allDone = scanned >= total && total > 0

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onClose}>← Back</button>
        <div style={styles.headerInfo}>
          <span style={styles.ref}>{order.reference}</span>
          <span style={styles.customer}>{order.customer_name}</span>
        </div>
        <span style={styles.progress}>{scanned}/{total}</span>
      </div>

      {/* Complete banner */}
      {allDone && (
        <div style={styles.completeBanner}>
          <div style={styles.completeIcon}>✓</div>
          <div style={styles.completeText}>
            <strong>Order complete</strong>
            <span>All items scanned — confirm to finish</span>
          </div>
          <button style={styles.completeBtn} onClick={onComplete}>
            Confirm shipment
          </button>
        </div>
      )}

      {/* Pick list */}
      <div style={styles.table}>
        <div style={styles.tableHead}>
          <span style={{ flex: 3 }}>Product</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Location</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Progress</span>
        </div>
        {items.map(item => (
          <PickRow key={item.id} item={item} />
        ))}
      </div>

      {/* Scan hint */}
      <p style={styles.hint}>
        Scanner is active — pull trigger to scan
      </p>
    </div>
  )
}

function PickRow({ item }) {
  const product = item.product
  const done = item.scanned_quantity >= item.quantity
  const partial = item.scanned_quantity > 0 && !done

  const dot = done ? '#1d9e75' : partial ? '#ef9f27' : '#ccc'
  const bg = done ? '#f0faf6' : partial ? '#fffbf0' : '#fff'

  return (
    <div style={{ ...styles.row, background: bg }}>
      <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ ...styles.dot, background: dot }} />
        <div>
          <div style={styles.productName}>{product?.name}</div>
          <div style={styles.sku}>{product?.sku}</div>
        </div>
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={styles.location}>{product?.location || '—'}</span>
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={{
          ...styles.qty,
          color: done ? '#0f6e56' : partial ? '#854f0b' : '#999',
          fontWeight: done || partial ? '500' : '400'
        }}>
          {item.scanned_quantity}/{item.quantity}
        </span>
      </div>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)' },
  header: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', background: '#fff',
    borderBottom: '0.5px solid #e0dfd8'
  },
  backBtn: {
    fontSize: '13px', color: '#555', border: 'none',
    background: 'none', cursor: 'pointer', padding: '4px 0'
  },
  headerInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  ref: { fontSize: '15px', fontWeight: '500', color: '#1a1a18' },
  customer: { fontSize: '12px', color: '#888' },
  progress: { fontSize: '15px', fontWeight: '500', color: '#378add' },
  completeBanner: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', background: '#e1f5ee',
    borderBottom: '0.5px solid #5dcaa5'
  },
  completeIcon: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#1d9e75', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: '500', flexShrink: 0
  },
  completeText: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '2px',
    fontSize: '13px', color: '#0f6e56'
  },
  completeBtn: {
    padding: '8px 18px', borderRadius: '8px', border: 'none',
    background: '#1d9e75', color: '#fff', fontSize: '13px',
    fontWeight: '500', cursor: 'pointer', flexShrink: 0
  },
  table: { flex: 1, overflow: 'auto' },
  tableHead: {
    display: 'flex', padding: '8px 16px',
    fontSize: '11px', color: '#999', fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '0.5px solid #e8e8e4', background: '#fafaf8'
  },
  row: {
    display: 'flex', alignItems: 'center', padding: '12px 16px',
    borderBottom: '0.5px solid #e8e8e4'
  },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  productName: { fontSize: '14px', color: '#1a1a18', fontWeight: '400' },
  sku: { fontSize: '12px', color: '#aaa', marginTop: '2px' },
  location: {
    fontSize: '12px', fontWeight: '500', color: '#555',
    background: '#f0efe8', padding: '3px 8px', borderRadius: '6px'
  },
  qty: { fontSize: '14px' },
  hint: {
    padding: '12px 16px', fontSize: '12px', color: '#bbb',
    textAlign: 'center', borderTop: '0.5px solid #e8e8e4'
  }
}
