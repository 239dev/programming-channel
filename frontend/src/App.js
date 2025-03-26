import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Login from './pages/Login';
import Register from './pages/Register';
import Channels from './pages/Channels';
import ChannelDetail from './pages/ChannelDetail';
import AdminPanel from './pages/AdminPanel';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

// Protected Route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/channels" />;
  }

  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <Routes 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/channels"
            element={
              <ProtectedRoute>
                <>
                  <Navbar toggleDarkMode={() => setDarkMode(!darkMode)} />
                  <Channels />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels/:channelId"
            element={
              <ProtectedRoute>
                <>
                  <Navbar toggleDarkMode={() => setDarkMode(!darkMode)} />
                  <ChannelDetail />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <>
                  <Navbar toggleDarkMode={() => setDarkMode(!darkMode)} />
                  <SearchPage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <>
                  <Navbar toggleDarkMode={() => setDarkMode(!darkMode)} />
                  <ProfilePage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <>
                  <Navbar toggleDarkMode={() => setDarkMode(!darkMode)} />
                  <AdminPanel />
                </>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/channels" />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;