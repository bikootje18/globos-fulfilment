const COLORS = {
  success: { bg: '#e1f5ee', border: '#5dcaa5', text: '#0f6e56' },
  info:    { bg: '#e6f0fb', border: '#85b7eb', text: '#1a5fae' },
  warning: { bg: '#faeeda', border: '#ef9f27', text: '#854f0b' },
  error:   { bg: '#fcebeb', border: '#f09595', text: '#a32d2d' }
}

export default function ScanFeedback({ feedback }) {
  const c = COLORS[feedback.type] || COLORS.info

  return (
    <div style={{
      ...styles.banner,
      background: c.bg,
      borderBottomColor: c.border,
      color: c.text
    }}>
      <span style={styles.icon}>
        {feedback.type === 'success' && '✓'}
        {feedback.type === 'error'   && '✕'}
        {feedback.type === 'warning' && '!'}
        {feedback.type === 'info'    && '·'}
      </span>
      <span style={styles.message}>{feedback.message}</span>
      {feedback.product?.location && (
        <span style={{ ...styles.location, color: c.text }}>
          {feedback.product.location}
        </span>
      )}
    </div>
  )
}

const styles = {
  banner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s'
  },
  icon: { fontSize: '16px', fontWeight: '700', flexShrink: 0, width: '20px', textAlign: 'center' },
  message: { flex: 1, fontSize: '14px', fontWeight: '500' },
  location: {
    fontSize: '12px', fontWeight: '500',
    background: 'rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '6px'
  }
}
