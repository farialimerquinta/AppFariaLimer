import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const RankingPage = lazy(() => import('./pages/RankingPage').then(m => ({ default: m.RankingPage })));
const AgendarJogoPage = lazy(() => import('./pages/AgendarJogoPage').then(m => ({ default: m.AgendarJogoPage })));
const RegistrarResultadoPage = lazy(() => import('./pages/RegistrarResultadoPage').then(m => ({ default: m.RegistrarResultadoPage })));
const JogosPage = lazy(() => import('./pages/JogosPage').then(m => ({ default: m.JogosPage })));
const JogadoresPage = lazy(() => import('./pages/JogadoresPage').then(m => ({ default: m.JogadoresPage })));
const RecuperarAcessoPage = lazy(() => import('./pages/RecuperarAcessoPage').then(m => ({ default: m.RecuperarAcessoPage })));
const ResetDataPage = lazy(() => import('./pages/ResetDataPage').then(m => ({ default: m.ResetDataPage })));
const AdminLogsPage = lazy(() => import('./pages/AdminLogsPage').then(m => ({ default: m.AdminLogsPage })));
const AdminUsuariosPage = lazy(() => import('./pages/AdminUsuariosPage').then(m => ({ default: m.AdminUsuariosPage })));
const H2HPage = lazy(() => import('./pages/H2HPage').then(m => ({ default: m.H2HPage })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;

  if (!user || user.nivel_acesso !== 'admin') {
    return <Navigate to="/" />;
  }

  return <PrivateRoute>{children}</PrivateRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/ranking" element={<PrivateRoute><RankingPage /></PrivateRoute>} />
            <Route path="/h2h" element={<PrivateRoute><H2HPage /></PrivateRoute>} />
            <Route path="/agendar-jogos" element={<PrivateRoute><AgendarJogoPage /></PrivateRoute>} />
            <Route path="/jogos" element={<PrivateRoute><JogosPage /></PrivateRoute>} />
            <Route path="/registrar-resultado" element={<PrivateRoute><RegistrarResultadoPage /></PrivateRoute>} />
            
            <Route path="/jogadores" element={<PrivateRoute><JogadoresPage /></PrivateRoute>} />
            <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuariosPage /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><AdminLogsPage /></AdminRoute>} />
            <Route path="/admin/reset" element={<AdminRoute><ResetDataPage /></AdminRoute>} />
            <Route path="/recuperar-acesso" element={<RecuperarAcessoPage />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
