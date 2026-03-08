import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ServerDetail from './pages/ServerDetail.jsx';
import Nodes from './pages/Nodes.jsx';
import Users from './pages/Users.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ background: '#000', height: '100vh' }} />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="servers/:id" element={<ServerDetail />} />
        <Route path="nodes" element={<Nodes />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}
