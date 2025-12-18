import React from 'react';
import { useAuth } from './AuthContext';
import { UserRole } from './types';
import { LogOut, LayoutDashboard, Users, Wrench, Settings, Building2, AlertTriangle, Package, Briefcase, DollarSign, UserCheck, Calendar, FileText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { user, company, logout } = useAuth();
  const isMaster = user?.role === UserRole.MASTER;

  const getDaysRemaining = () => {
    if (!company) return 0;
    const diff = company.expiresAt - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 h-auto md:h-full relative z-20">
        <div className="p-6 flex-shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">OficinaPro</h1>
          {!isMaster && company && (
             <p className="text-xs text-slate-400 mt-1 truncate">{company.name}</p>
          )}
          {isMaster && (
             <p className="text-xs text-yellow-400 mt-1 font-mono">MODO MASTER (TMDEV)</p>
          )}
        </div>

        <nav className="px-4 space-y-2 mt-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          {isMaster ? (
             <button
             onClick={() => onNavigate('master-dashboard')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'master-dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
           >
             <Building2 size={20} />
             <span>Gerenciar Empresas</span>
           </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <LayoutDashboard size={20} />
                <span>Visão Geral</span>
              </button>
              <button
                onClick={() => onNavigate('agenda')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'agenda' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Calendar size={20} />
                <span>Agenda</span>
              </button>
              <button
                onClick={() => onNavigate('os')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'os' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Wrench size={20} />
                <span>Ordens de Serviço</span>
              </button>
              <button
                onClick={() => onNavigate('customers')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'customers' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Users size={20} />
                <span>Clientes e Veículos</span>
              </button>
              <button
                onClick={() => onNavigate('team')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'team' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <UserCheck size={20} />
                <span>Equipe e Comissão</span>
              </button>
              <button
                onClick={() => onNavigate('inventory')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Package size={20} />
                <span>Estoque de Peças</span>
              </button>
              <button
                onClick={() => onNavigate('financial')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'financial' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <DollarSign size={20} />
                <span>Financeiro</span>
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <FileText size={20} />
                <span>Relatórios</span>
              </button>
              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('settings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Settings size={20} />
                  <span>Configurações</span>
                </button>
              </div>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 flex-shrink-0 bg-slate-900">
           {!isMaster && (
             <div className={`mb-4 p-3 rounded-lg text-xs ${isExpired ? 'bg-red-900/50 text-red-200' : isExpiringSoon ? 'bg-yellow-900/30 text-yellow-200' : 'bg-slate-800 text-slate-300'}`}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                   <Briefcase size={14} />
                   Licença: {company?.plan}
                </div>
                {isExpired ? (
                  <span className="font-bold">EXPIRADA! Contate o suporte.</span>
                ) : (
                  <span>Expira em: {daysRemaining} dias</span>
                )}
             </div>
           )}
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 py-2 rounded-lg transition-all"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-full bg-gray-50 relative">
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 md:px-8 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-gray-800">
              {activePage === 'dashboard' && 'Painel de Controle'}
              {activePage === 'agenda' && 'Agenda Digital'}
              {activePage === 'os' && 'Ordens de Serviço'}
              {activePage === 'customers' && 'Gestão de Clientes'}
              {activePage === 'team' && 'Equipe e Comissões'}
              {activePage === 'inventory' && 'Controle de Estoque'}
              {activePage === 'financial' && 'Gestão Financeira'}
              {activePage === 'reports' && 'Relatórios Gerenciais'}
              {activePage === 'settings' && 'Configurações da Empresa'}
              {activePage === 'master-dashboard' && 'Administração Global'}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
        </header>
        <div className="p-4 md:p-8 pb-20">
          {!isMaster && isExpired && (
             <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 flex items-start gap-4">
               <AlertTriangle className="text-red-600 shrink-0" size={24} />
               <div>
                 <h3 className="text-red-800 font-bold text-lg">Licença Expirada</h3>
                 <p className="text-red-700">O período de uso da sua empresa expirou. O acesso a novas ações está bloqueado. Por favor, entre em contato com o desenvolvedor para renovar sua licença.</p>
               </div>
             </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};