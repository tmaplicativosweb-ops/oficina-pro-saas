import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, ChatMessage } from '../types';
import { dbService } from '../services/mockDb';
import { LogOut, LayoutDashboard, Users, Wrench, Settings, Building2, AlertTriangle, Package, Briefcase, DollarSign, UserCheck, Calendar, FileText, Menu, X, LifeBuoy, MessageCircle, Mail, Send, MessageSquare } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const ChatWidget: React.FC = () => {
  const { user, company } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    if (isOpen && company) {
      // Use real-time subscription instead of polling
      unsubscribe = dbService.subscribeToChatMessages(company.id, (msgs) => {
        setMessages(msgs);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, company]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !company || !user) return;

    const newMessage: Omit<ChatMessage, 'id'> = {
      companyId: company.id,
      senderRole: 'CLIENT',
      senderName: user.name,
      text: inputText,
      createdAt: Date.now(),
      read: false
    };

    await dbService.sendChatMessage(newMessage);
    setInputText('');
    // No need to reload manually, subscription handles it
  };

  if (!company) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg z-50 flex items-center justify-center transition-transform hover:scale-110"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-blue-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
               <LifeBuoy size={20} />
               <h3 className="font-bold">Suporte OficinaPro</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.length === 0 && (
               <div className="text-center text-gray-400 text-sm mt-10">
                  <p>Olá! Como podemos ajudar?</p>
                  <p className="text-xs mt-2">Envie sua dúvida abaixo.</p>
               </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.senderRole === 'CLIENT' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-sm ${
                    msg.senderRole === 'CLIENT'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { user, company, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMaster = user?.role === UserRole.MASTER;

  // Calculate days remaining if company exists
  const getDaysRemaining = () => {
    if (!company) return 0;
    const diff = company.expiresAt - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;

  const handleMobileNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Header Overlay for Menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col h-full
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        
        {/* Sidebar Header */}
        <div className="p-6 flex-shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-400">OficinaPro</h1>
            {!isMaster && company && (
               <p className="text-xs text-slate-400 mt-1 truncate max-w-[180px]">{company.name}</p>
            )}
            {isMaster && (
               <p className="text-xs text-yellow-400 mt-1 font-mono">MODO MASTER</p>
            )}
          </div>
          {/* Close button for mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="px-4 space-y-2 mt-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          {isMaster ? (
             <button
             onClick={() => handleMobileNavigate('master-dashboard')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'master-dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
           >
             <Building2 size={20} />
             <span>Gerenciar Empresas</span>
           </button>
          ) : (
            <>
              <button
                onClick={() => handleMobileNavigate('dashboard')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <LayoutDashboard size={20} />
                <span>Visão Geral</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('agenda')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'agenda' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Calendar size={20} />
                <span>Agenda</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('os')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'os' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Wrench size={20} />
                <span>Ordens de Serviço</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('customers')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'customers' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Users size={20} />
                <span>Clientes e Veículos</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('team')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'team' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <UserCheck size={20} />
                <span>Equipe e Comissão</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('inventory')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Package size={20} />
                <span>Estoque de Peças</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('financial')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'financial' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <DollarSign size={20} />
                <span>Financeiro</span>
              </button>
              <button
                onClick={() => handleMobileNavigate('reports')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <FileText size={20} />
                <span>Relatórios</span>
              </button>
              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={() => handleMobileNavigate('settings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Settings size={20} />
                  <span>Configurações</span>
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-full bg-gray-50 relative">
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 md:px-8 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {/* Hamburger Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
              >
                <Menu size={24} />
              </button>
              
              <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate">
                {activePage === 'dashboard' && 'Painel de Controle'}
                {activePage === 'agenda' && 'Agenda Digital'}
                {activePage === 'os' && 'Ordens de Serviço'}
                {activePage === 'customers' && 'Gestão de Clientes'}
                {activePage === 'team' && 'Equipe e Comissões'}
                {activePage === 'inventory' && 'Controle de Estoque'}
                {activePage === 'financial' && 'Gestão Financeira'}
                {activePage === 'reports' && 'Relatórios Gerenciais'}
                {activePage === 'settings' && 'Configurações'}
                {activePage === 'master-dashboard' && 'Admin Global'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm md:text-base">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
        </header>
        <div className="p-4 md:p-8 pb-20 relative">
          {/* Global License Warning Overlay for functionality */}
          {!isMaster && isExpired && (
             <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 mb-6 flex flex-col md:flex-row items-start gap-4 justify-between">
               <div className="flex items-start gap-4">
                  <AlertTriangle className="text-red-600 shrink-0" size={24} />
                  <div>
                    <h3 className="text-red-800 font-bold text-lg">Licença Expirada</h3>
                    <p className="text-red-700 text-sm md:text-base">O período de uso da sua empresa expirou. O acesso a novas ações está bloqueado.</p>
                  </div>
               </div>
             </div>
          )}
          {children}
        </div>
        
        {/* Render Chat Widget only for CLIENT roles */}
        {!isMaster && <ChatWidget />}
      </main>
    </div>
  );
};