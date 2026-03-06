import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Events from './pages/Events'
import Communities from './pages/Communities'
import LostFound from './pages/LostFound'
import Forums from './pages/Forums'
import GroupChat from './pages/GroupChat'
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
              <Route path="events" element={<Events />} />
              <Route path="communities" element={<Communities />} />
              <Route path="lost-found" element={<LostFound />} />
              <Route path="forums" element={<Forums />} />
              <Route path="chat" element={<GroupChat />} />
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
