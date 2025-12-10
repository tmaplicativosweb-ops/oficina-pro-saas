import React, { useEffect, useState, useRef } from 'react';
import { dbService, authService } from '../services/mockDb';
import { Company, CompanyStatus, PlanType, ChatMessage } from '../types';
import { Shield, Ban, CheckCircle, Calendar, LogIn, DollarSign, TrendingUp, AlertTriangle, Users, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (val: number) => {
   return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const PLAN_MRR = {
  [PlanType.DEMO]: 0,
  [PlanType.MONTHLY]: 99.90,
  [PlanType.SEMIANNUAL]: 89.90, 
  [PlanType.ANNUAL]: 79.90 
};

const StatsCard: React.FC<{ title: string; value: string | number; icon: any; colorBg: string; colorText: string; subtext?: string }> = ({ title, value, icon: Icon, colorBg, colorText, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
    <div className={`p-4 rounded-full ${colorBg} ${colorText}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

// --- SUPPORT CHAT COMPONENT ---
const SupportChatView: React.FC<{ companies: Company[] }> = ({ companies }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();

  const loadMessages = async () => {
    if (selectedCompanyId) {
      const msgs = await dbService.getChatMessages(selectedCompanyId);
      setMessages(msgs);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedCompanyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedCompanyId || !user) return;

    const newMessage: Omit<ChatMessage, 'id'> = {
      companyId: selectedCompanyId,
      senderRole: 'MASTER',
      senderName: 'Suporte Master',
      text: inputText,
      createdAt: Date.now(),
      read: false
    };

    await dbService.sendChatMessage(newMessage);
    setInputText('');
    loadMessages();
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-700">Oficinas Clientes</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompanyId(c.id)}
              className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors flex justify-between items-center ${selectedCompanyId === c.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
            >
              <div>
                <p className="font-medium text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-500">{c.email}</p>
              </div>
              <MessageSquare size={16} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedCompanyId ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between">
               <h3 className="font-bold text-gray-800">
                  {companies.find(c => c.id === selectedCompanyId)?.name}
               </h3>
               <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  ID: {selectedCompanyId}
               </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">Nenhuma mensagem trocada ainda.</div>
               )}
               {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderRole === 'MASTER' ? 'items-end' : 'items-start'}`}>
                     <div className={`max-w-[70%] p-3 rounded-xl shadow-sm text-sm ${
                        msg.senderRole === 'MASTER' 
                           ? 'bg-blue-600 text-white rounded-br-none' 
                           : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                     }`}>
                        <p className="font-bold text-[10px] opacity-70 mb-1">{msg.senderName}</p>
                        {msg.text}
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                  </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
               <div className="flex gap-2">
                  <input 
                     className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                     placeholder="Digite sua resposta..."
                     value={inputText}
                     onChange={e => setInputText(e.target.value)}
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                     <Send size={20} />
                  </button>
               </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <MessageSquare size={48} className="mb-4 opacity-20" />
             <p>Selecione uma oficina ao lado para iniciar o suporte.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const MasterDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'support'>('overview'); // Toggle view
  const { login } = useAuth();

  const fetchCompanies = async () => {
    setLoading(true);
    const data = await dbService.getCompanies();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleStatusChange = async (id: string, newStatus: CompanyStatus) => {
    await dbService.updateCompanyStatus(id, newStatus);
    fetchCompanies();
  };

  const handleExtend = async (id: string, plan: PlanType, days: number) => {
    if(window.confirm(`Deseja adicionar ${days} dias e mudar o plano para ${plan}?`)) {
       await dbService.extendLicense(id, plan, days);
       fetchCompanies();
    }
  };

  const handleImpersonate = async (id: string, name: string) => {
      if(window.confirm(`Entrar no painel da empresa "${name}"?`)) {
          try {
            const { user, company } = await authService.impersonate(id);
            login(user, company);
          } catch(err: any) {
             alert(err.message);
          }
      }
  };

  const activeCompanies = companies.filter(c => c.status === CompanyStatus.ACTIVE);
  const blockedCompanies = companies.filter(c => c.status === CompanyStatus.BLOCKED || c.status === CompanyStatus.EXPIRED);
  
  const mrr = activeCompanies.reduce((acc, c) => acc + (PLAN_MRR[c.plan] || 0), 0);
  const totalCompanies = companies.length;
  const churnRate = totalCompanies > 0 ? (blockedCompanies.length / totalCompanies) * 100 : 0;
  
  const expiringSoonCount = activeCompanies.filter(c => {
     const daysLeft = Math.ceil((c.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
     return daysLeft > 0 && daysLeft <= 7;
  }).length;

  if (loading) return <div className="text-center p-10">Carregando dados globais...</div>;

  return (
    <div className="space-y-8">
      
      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 pb-2">
         <button 
            onClick={() => setView('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
         >
            Visão Geral
         </button>
         <button 
            onClick={() => setView('support')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'support' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
         >
            Central de Suporte (Chat)
         </button>
      </div>

      {view === 'overview' ? (
      <>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard 
               title="MRR Mensal" 
               value={formatCurrency(mrr)} 
               icon={DollarSign} 
               colorBg="bg-green-100"
               colorText="text-green-600"
               subtext="Receita recorrente estimada"
            />
            <StatsCard 
               title="Total de Oficinas" 
               value={totalCompanies} 
               icon={Users} 
               colorBg="bg-blue-100"
               colorText="text-blue-600"
               subtext={`${activeCompanies.length} ativas, ${blockedCompanies.length} paradas`}
            />
            <StatsCard 
               title="Churn Rate" 
               value={`${churnRate.toFixed(1)}%`} 
               icon={TrendingUp} 
               colorBg="bg-red-100"
               colorText="text-red-600"
               subtext="Taxa de cancelamento"
            />
            <StatsCard 
               title="Expirações na Semana" 
               value={expiringSoonCount} 
               icon={AlertTriangle} 
               colorBg="bg-orange-100"
               colorText="text-orange-600"
               subtext="Risco de cancelamento iminente"
            />
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Shield className="mr-2 text-blue-600" />
            Controle de Clientes (SaaS)
         </h3>
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
               <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expira em</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
               </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
               {companies.map((c) => {
                  const daysLeft = Math.ceil((c.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft <= 0;

                  return (
                     <tr key={c.id}>
                     <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.document}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {c.email}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {c.plan}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`${isExpired ? 'text-red-600 font-bold' : daysLeft < 5 ? 'text-orange-500' : 'text-green-600'}`}>
                           {daysLeft} dias
                        </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                        {c.status === CompanyStatus.ACTIVE && <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Ativo</span>}
                        {c.status === CompanyStatus.BLOCKED && <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Bloqueado</span>}
                        {c.status === CompanyStatus.EXPIRED && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Expirado</span>}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                              onClick={() => handleImpersonate(c.id, c.name)}
                              title="Entrar como Cliente"
                              className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 p-2 rounded-lg"
                        >
                              <LogIn size={16} />
                        </button>

                        {c.status === CompanyStatus.ACTIVE ? (
                           <button 
                              onClick={() => handleStatusChange(c.id, CompanyStatus.BLOCKED)}
                              title="Bloquear Acesso"
                              className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg"
                           >
                              <Ban size={16} />
                           </button>
                        ) : (
                           <button 
                              onClick={() => handleStatusChange(c.id, CompanyStatus.ACTIVE)}
                              title="Desbloquear"
                              className="text-green-500 hover:text-green-700 bg-green-50 p-2 rounded-lg"
                           >
                              <CheckCircle size={16} />
                           </button>
                        )}
                        
                        <div className="inline-block relative group">
                           <button className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-lg">
                              <Calendar size={16} />
                           </button>
                           <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-50">
                              <div className="p-2 space-y-1">
                                 <button onClick={() => handleExtend(c.id, PlanType.MONTHLY, 30)} className="w-full text-left text-xs px-2 py-2 hover:bg-gray-100 rounded">Renovar Mensal (+30d)</button>
                                 <button onClick={() => handleExtend(c.id, PlanType.SEMIANNUAL, 180)} className="w-full text-left text-xs px-2 py-2 hover:bg-gray-100 rounded">Renovar Semestral (+180d)</button>
                                 <button onClick={() => handleExtend(c.id, PlanType.ANNUAL, 365)} className="w-full text-left text-xs px-2 py-2 hover:bg-gray-100 rounded">Renovar Anual (+365d)</button>
                              </div>
                           </div>
                        </div>
                     </td>
                     </tr>
                  );
               })}
               </tbody>
            </table>
            {companies.length === 0 && (
               <div className="p-8 text-center text-gray-500">Nenhuma empresa cadastrada.</div>
            )}
         </div>
         </div>
      </>
      ) : (
         <SupportChatView companies={companies} />
      )}
    </div>
  );
};