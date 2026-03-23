export default function OrderList({ orders, loading, operator, onSelect }) {
  if (loading) return <div style={styles.empty}>Loading orders...</div>
  if (!orders.length) return <div style={styles.empty}>No open orders</div>

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>Open orders</span>
        <span style={styles.count}>{orders.length}</span>
      </div>
      <div style={styles.list}>
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            operator={operator}
            onSelect={onSelect}
          />
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
      style={{
        ...styles.card,
        ...(isLocked ? styles.cardLocked : {}),
        ...(isMine ? styles.cardMine : {})
      }}
      onClick={() => !isLocked && onSelect(order)}
    >
      <div style={styles.cardTop}>
        <span style={styles.ref}>{order.reference}</span>
        {isLocked && (
          <span style={styles.lockedBadge}>
            {order.locked_by}
          </span>
        )}
        {isMine && (
          <span style={styles.mineBadge}>You</span>
        )}
      </div>
      <div style={styles.customer}>{order.customer_name}</div>
      <div style={styles.progress}>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${pct}%`,
            background: pct === 100 ? '#1d9e75' : '#378add'
          }} />
        </div>
        <span style={styles.progressText}>{scanned}/{total} items</span>
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: '16px', maxWidth: '600px', margin: '0 auto' },
  header: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '12px'
  },
  title: { fontSize: '15px', fontWeight: '500', color: '#333' },
  count: {
    fontSize: '12px', background: '#e0dfd8', color: '#666',
    padding: '2px 8px', borderRadius: '10px'
  },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  empty: { padding: '48px', textAlign: 'center', color: '#999', fontSize: '15px' },
  card: {
    background: '#fff', border: '0.5px solid #e0dfd8',
    borderRadius: '12px', padding: '14px 16px',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px'
  },
  cardLocked: { opacity: 0.5, cursor: 'not-allowed', background: '#fafaf8' },
  cardMine: { borderColor: '#85b7eb', background: '#f0f6fd' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '8px' },
  ref: { fontSize: '14px', fontWeight: '500', color: '#1a1a18', flex: 1 },
  customer: { fontSize: '13px', color: '#666' },
  lockedBadge: {
    fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
    background: '#f0efe8', color: '#888'
  },
  mineBadge: {
    fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
    background: '#e6f0fb', color: '#1a5fae', fontWeight: '500'
  },
  progress: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' },
  progressBar: {
    flex: 1, height: '4px', borderRadius: '2px',
    background: '#e8e8e4', overflow: 'hidden'
  },
  progressFill: { height: '100%', borderRadius: '2px', transition: 'width 0.3s' },
  progressText: { fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }
}
