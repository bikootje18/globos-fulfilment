import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { useScanInput } from '../hooks/useScanInput.js'
import OrderList from '../components/OrderList.jsx'
import OrderDetail from '../components/OrderDetail.jsx'
import ScanFeedback from '../components/ScanFeedback.jsx'

export default function Dashboard({ operator, onLogout }) {
  const [mode, setMode] = useState('outgoing') // 'outgoing' | 'incoming'
  const [orders, setOrders] = useState([])
  const [activeOrder, setActiveOrder] = useState(null)
  const [feedback, setFeedback] = useState(null) // { type, message, product }
  const [loading, setLoading] = useState(true)

  // Load orders on mount
  useEffect(() => {
    loadOrders()
  }, [])

  const activeOrderRef = useRef(null)
  useEffect(() => { activeOrderRef.current = activeOrder }, [activeOrder])

  // Realtime subscription — updates all tablets instantly
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadOrders()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          loadOrders()
          if (activeOrderRef.current) refreshActiveOrder(activeOrderRef.current.id)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadOrders() {
    try {
      const data = await api.getOrders()
      setOrders(data)
    } catch {
      showFeedback('error', 'Orders laden mislukt — probeer opnieuw')
    } finally {
      setLoading(false)
    }
  }

  async function refreshActiveOrder(id) {
    const data = await api.getOrder(id)
    setActiveOrder(data)
  }

  async function handleSelectOrder(order) {
    try {
      await api.lockOrder(order.id, operator)
      await refreshActiveOrder(order.id)
    } catch (err) {
      showFeedback('error', err.message)
    }
  }

  async function handleCloseOrder() {
    if (activeOrder) {
      try {
        await api.unlockOrder(activeOrder.id)
      } catch {
        // unlock failed — still clear local state, backend will time out lock eventually
      }
    }
    setActiveOrder(null)
  }

  async function handleCompleteOrder() {
    if (activeOrder) {
      try {
        await api.completeOrder(activeOrder.id, operator)
        showFeedback('success', `Order ${activeOrder.reference} klaar!`)
        setActiveOrder(null)
        loadOrders()
      } catch (err) {
        showFeedback('error', err.message)
      }
    }
  }

  const handleScan = useCallback(async (barcode) => {
    try {
      const result = await api.processScan(
        barcode,
        activeOrder?.id || null,
        operator,
        mode
      )

      switch (result.result) {
        case 'item_complete':
          showFeedback('success', `${result.product.name} ✓`, result.product)
          break
        case 'item_progress':
          showFeedback('info',
            `${result.product.name} — ${result.item.scanned_quantity}/${result.item.quantity}`,
            result.product
          )
          break
        case 'over_pick':
          showFeedback('warning', `Let op: je hebt er al ${result.item.scanned_quantity} van ${result.product.name}`)
          break
        case 'unexpected_item':
          showFeedback('error', `Not on this order: ${result.product.name}`)
          break
        case 'stock_updated':
          showFeedback('success', `Stock updated: ${result.product.name}`)
          break
        default:
          showFeedback('info', `Scanned: ${result.product?.name || barcode}`)
      }

      if (activeOrder) refreshActiveOrder(activeOrder.id)
    } catch (err) {
      showFeedback('error', err.message.includes('Unknown barcode')
        ? `Unknown barcode: ${barcode}`
        : err.message
      )
    }
  }, [activeOrder, operator, mode])

  function showFeedback(type, message, product = null) {
    setFeedback({ type, message, product })
    setTimeout(() => setFeedback(null), 2500)
  }

  const { inputRef, handleKeyDown } = useScanInput(handleScan, true)

  return (
    <div style={styles.app}>
      {/* Hidden scan input — always focused */}
      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        style={styles.hiddenInput}
        readOnly
        aria-hidden="true"
      />

      {/* Top bar */}
      <div style={styles.topbar}>
        <div style={styles.topLeft}>
          <button
            style={{ ...styles.modeBtn, ...(mode === 'outgoing' ? styles.modeBtnActive : {}) }}
            onClick={() => { setMode('outgoing'); setActiveOrder(null) }}
          >
            Outgoing
          </button>
          <button
            style={{ ...styles.modeBtn, ...(mode === 'incoming' ? styles.modeBtnActiveIn : {}) }}
            onClick={() => { setMode('incoming'); setActiveOrder(null) }}
          >
            Incoming
          </button>
        </div>
        <div style={styles.topRight}>
          <span style={styles.operatorBadge}>{operator}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Leave</button>
        </div>
      </div>

      {/* Scan feedback flash */}
      {feedback && <ScanFeedback feedback={feedback} />}

      {/* Main content */}
      <div style={styles.content}>
        {mode === 'outgoing' ? (
          activeOrder ? (
            <OrderDetail
              order={activeOrder}
              operator={operator}
              onClose={handleCloseOrder}
              onComplete={handleCompleteOrder}
              onSplit={loadOrders}
            />
          ) : (
            <OrderList
              orders={orders}
              loading={loading}
              operator={operator}
              onSelect={handleSelectOrder}
              onRefresh={loadOrders}
            />
          )
        ) : (
          <IncomingMode />
        )}
      </div>
    </div>
  )
}

function IncomingMode() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📥</div>
      <p style={{ fontSize: '18px', fontWeight: '500', color: '#333' }}>Incoming mode active</p>
      <p style={{ fontSize: '14px', marginTop: '8px' }}>
        Scan any product barcode to add stock
      </p>
    </div>
  )
}

const styles = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f4f0' },
  hiddenInput: {
    position: 'absolute', opacity: 0, pointerEvents: 'none',
    width: 1, height: 1, top: 0, left: 0
  },
  topbar: {
    background: '#fff', borderBottom: '0.5px solid #e0dfd8',
    padding: '12px 16px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    gap: '12px'
  },
  topLeft: { display: 'flex', gap: '8px' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  modeBtn: {
    padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
    border: '0.5px solid #ddd', background: '#fafaf8',
    color: '#666', fontWeight: '400', cursor: 'pointer'
  },
  modeBtnActive: {
    background: '#e6f0fb', color: '#1a5fae',
    borderColor: '#85b7eb', fontWeight: '500'
  },
  modeBtnActiveIn: {
    background: '#e1f5ee', color: '#0f6e56',
    borderColor: '#5dcaa5', fontWeight: '500'
  },
  operatorBadge: {
    fontSize: '13px', fontWeight: '500', color: '#444',
    background: '#f0efe8', padding: '5px 12px', borderRadius: '20px'
  },
  logoutBtn: {
    fontSize: '12px', color: '#999', border: 'none',
    background: 'none', cursor: 'pointer', padding: '4px 8px'
  },
  content: { flex: 1, overflow: 'auto' }
}
