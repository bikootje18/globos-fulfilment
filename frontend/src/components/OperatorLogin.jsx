import { useState } from 'react'

const OPERATORS = ['Kamilla', 'Martina', 'Pampuch', 'Sezar', 'Wessel']

export default function OperatorLogin({ onLogin }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onLogin(name.trim())
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1a1a18"/>
            <path d="M8 22L14 10l4 8 3-5 5 9" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <h1 style={styles.title}>Fulfillment Scanner</h1>
        <p style={styles.sub}>Who is scanning today?</p>

        <div style={styles.grid}>
          {OPERATORS.map(op => (
            <button key={op} style={styles.opBtn} onClick={() => onLogin(op)}>
              <span style={styles.initials}>
                {op.slice(0, 2).toUpperCase()}
              </span>
              <span style={styles.opName}>{op}</span>
            </button>
          ))}
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or enter name</span>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" style={styles.btn} disabled={!name.trim()}>
            Start scanning
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#f4f4f0'
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    border: '0.5px solid #e0dfd8',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  logo: { display: 'flex', justifyContent: 'center' },
  title: { fontSize: '20px', fontWeight: '500', textAlign: 'center', color: '#1a1a18' },
  sub: { fontSize: '14px', color: '#888', textAlign: 'center', marginTop: '-12px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
  },
  opBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 8px',
    border: '0.5px solid #e0dfd8',
    borderRadius: '10px',
    background: '#fafaf8',
    cursor: 'pointer',
    transition: 'background 0.1s'
  },
  initials: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: '#e8f0fb', color: '#1a5fae',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '500'
  },
  opName: { fontSize: '12px', color: '#444' },
  divider: {
    display: 'flex', alignItems: 'center', gap: '10px'
  },
  dividerText: {
    fontSize: '12px', color: '#aaa', whiteSpace: 'nowrap',
    flex: '1', textAlign: 'center',
    borderTop: '0.5px solid #e0dfd8',
    paddingTop: '10px'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: {
    height: '44px', padding: '0 14px', borderRadius: '8px',
    border: '0.5px solid #ccc', fontSize: '15px', outline: 'none',
    background: '#fafaf8'
  },
  btn: {
    height: '44px', borderRadius: '8px', border: 'none',
    background: '#1a1a18', color: '#fff', fontSize: '15px',
    fontWeight: '500', cursor: 'pointer'
  }
}
