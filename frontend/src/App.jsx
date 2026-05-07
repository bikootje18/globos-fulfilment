import { useState } from 'react'
import OperatorLogin from './components/OperatorLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'

function loadUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(loadUser)

  function handleLogin(u) {
    sessionStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  function handleLogout() {
    sessionStorage.removeItem('user')
    setUser(null)
  }

  if (!user) return <OperatorLogin onLogin={handleLogin} />
  if (user.role === 'manager') return <ManagerDashboard manager={user} onLogout={handleLogout} />
  return <Dashboard operator={user.name} onLogout={handleLogout} />
}
