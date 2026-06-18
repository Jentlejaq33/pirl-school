import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { RequireAuth, RequireRole } from './lib/guards'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Results from './pages/Results'
import Reports from './pages/Reports'
import Fees from './pages/Fees'
import Sports from './pages/Sports'
import Comms from './pages/Comms'
import Users from './pages/Users'
import Settings from './pages/Settings'

const STAFF = ['school_admin','teacher','bursar']

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="students"  element={<RequireRole roles={STAFF}><Students /></RequireRole>} />
            <Route path="attendance" element={<RequireRole roles={['school_admin','teacher']}><Attendance /></RequireRole>} />
            <Route path="results"   element={<Results />} />
            <Route path="reports"   element={<Reports />} />
            <Route path="fees"      element={<Fees />} />
            <Route path="sports"    element={<Sports />} />
            <Route path="comms"     element={<RequireRole roles={STAFF}><Comms /></RequireRole>} />
            <Route path="users"     element={<RequireRole roles={['school_admin']}><Users /></RequireRole>} />
            <Route path="settings"  element={<RequireRole roles={['school_admin']}><Settings /></RequireRole>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
