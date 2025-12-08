import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './Login';
import { Register } from './Register';
import { MasterDashboard } from './MasterDashboard';
import { ClientDashboard } from './ClientDashboard';
import { Layout } from './Layout';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');
  const [activePage, setActivePage] = useState('dashboard');

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400">Carregando sistema...</div>;
  }

  if (!isAuthenticated) {
    if (view === 'register') {
      return <Register onBack={() => setView('login')} />;
    }
    return <Login onRegisterClick={() => setView('register')} />;
  }

  // Routing Logic
  const handleNavigate = (page: string) => {
    setActivePage(page);
  };

  // Determine which main view to show based on Role and activePage
  let content;
  if (user?.role === UserRole.MASTER) {
     content = <MasterDashboard />;
  } else {
     // Default active page reset if switching from Master to Client (unlikely but safe)
     const page = activePage === 'master-dashboard' ? 'dashboard' : activePage;
     content = <ClientDashboard page={page} onNavigate={handleNavigate} />;
  }

  // Override activePage visually for Master
  const displayedPage = user?.role === UserRole.MASTER ? 'master-dashboard' : activePage;

  return (
    <Layout activePage={displayedPage} onNavigate={handleNavigate}>
      {content}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;