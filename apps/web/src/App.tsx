import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { Devices } from './pages/Devices'
import { DeviceDetail } from './pages/DeviceDetail'
import { Reports } from './pages/Reports'
import { MapView } from './pages/MapView'
import { AdminDashboard } from './pages/AdminDashboard'
import { CompareRooms } from './pages/CompareRooms'
import { Analytics } from './pages/Analytics'
import Login from './pages/Login'
import Alerts from './pages/Alerts'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'
import './styles/App.css'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/devices" element={
          <ProtectedRoute>
            <Layout>
              <Devices />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/devices/:deviceId" element={
          <ProtectedRoute>
            <Layout>
              <DeviceDetail />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/map" element={
          <ProtectedRoute>
            <Layout>
              <MapView />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/compare" element={
          <ProtectedRoute>
            <Layout>
              <CompareRooms />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={
          <ProtectedRoute>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/alerts" element={
          <ProtectedRoute>
            <Layout>
              <Alerts />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
