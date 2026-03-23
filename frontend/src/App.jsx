import { useState } from 'react'
import OperatorLogin from './components/OperatorLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const [operator, setOperator] = useState(null)

  if (!operator) {
    return <OperatorLogin onLogin={setOperator} />
  }

  return <Dashboard operator={operator} onLogout={() => setOperator(null)} />
}
