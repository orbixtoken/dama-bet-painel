// src/router/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const t = localStorage.getItem('token');
  if (!t) return <Navigate to="/login" replace />;
  return children;
}
