import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Events from './pages/Events'
import Communities from './pages/Communities'
import { ThemeProvider } from './context/ThemeContext'

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (adminOnly && !isAdmin) return <Navigate to="/" />
  return children
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Feed />} />
              <Route path="chat" element={<Chat />} />
              <Route path="events" element={<Events />} />
              <Route path="communities" element={<Communities />} />
              <Route path="profile" element={<Profile />} />
              <Route path="admin" element={
                <PrivateRoute adminOnly>
                  <AdminDashboard />
                </PrivateRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
