import { useState } from 'react'
import OperatorLogin from './components/OperatorLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'

export default function App() {
  const [user, setUser] = useState(null) // { name, role: 'operator'|'manager' }

  if (!user) return <OperatorLogin onLogin={setUser} />
  if (user.role === 'manager') return <ManagerDashboard manager={user} onLogout={() => setUser(null)} />
  return <Dashboard operator={user.name} onLogout={() => setUser(null)} />
}
