
import React, { useEffect, useState, useRef } from 'react';
import { dbService, authService } from './mockDb';
import { Company, CompanyStatus, PlanType, ChatMessage } from './types';
import { Shield, Ban, CheckCircle, LogIn, DollarSign, TrendingUp, AlertTriangle, Users, MessageSquare, Send, Loader2, Clock } from 'lucide-react';
import { useAuth } from './AuthContext';

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

const SupportChat: React.FC<{ companies: Company[] }> = ({ companies }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const loadMsgs = async () => {
        if (!selectedId) return;
        try {
            const data = await dbService.getChatMessages(selectedId);
            setMessages(data);
        } catch (err) {
            console.error("Erro ao carregar chat", err);
        }
    };

    useEffect(() => {
        loadMsgs();
        const interval = setInterval(loadMsgs, 5000);
        return () => clearInterval(interval);
    }, [selectedId]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || !selectedId) return;
        setLoading(true);
        try {
            await dbService.sendChatMessage({
                companyId: selectedId,
                senderRole: 'MASTER',
                senderName: 'Suporte OficinaPro',
                text: newMsg,
                createdAt: Date.now(),
                read: false
            });
            setNewMsg('');
            loadMsgs();
        } catch (err) {
            alert("Erro ao enviar mensagem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[600px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
                <div className="p-4 font-bold text-gray-700 border-b bg-white">Conversas de Suporte</div>
                {companies.map(c => (
                    <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left p-4 hover:bg-blue-50 border-b transition-colors ${selectedId === c.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''}`}>
                        <p className="font-bold text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                    </button>
                ))}
            </div>
            <div className="flex-1 flex flex-col bg-slate-50">
                {selectedId ? (
                    <>
                        <div className="p-4 border-b bg-white font-bold flex justify-between">
                            <span>{companies.find(c => c.id === selectedId)?.name}</span>
                            <span className="text-xs text-gray-400">ID: {selectedId}</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map(m => (
                                <div key={m.id} className={`flex ${m.senderRole === 'MASTER' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-xl text-sm shadow-sm ${m.senderRole === 'MASTER' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none'}`}>
                                        <p className="text-[10px] opacity-70 mb-1 font-bold">{m.senderName}</p>
                                        {m.text}
                                        <p className="text-[9px] opacity-50 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>
                        <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2">
                            <input className="flex-1 border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Digite sua resposta..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                                {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">Selecione uma oficina para responder.</div>
                )}
            </div>
        </div>
    );
};

export const MasterDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const { login } = useAuth();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
        const data = await dbService.getCompanies();
        setCompanies(data);
    } catch (err) {
        console.error("Erro ao carregar empresas.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleStatusChange = async (id: string, newStatus: CompanyStatus) => {
    setProcessingId(id);
    try {
        await dbService.updateCompanyStatus(id, newStatus);
        await fetchCompanies();
    } catch (err) {
        alert("Erro ao alterar status.");
    } finally {
        setProcessingId(null);
    }
  };

  const handleRenew30Days = async (id: string) => {
    if(window.confirm(`Deseja liberar mais 30 dias de acesso para esta oficina?`)) {
       setProcessingId(id);
       try {
           // Usamos o plano mensal como padrão para a renovação de 30 dias
           await dbService.extendLicense(id, PlanType.MONTHLY, 30);
           alert("Licença renovada por +30 dias com sucesso!");
           await fetchCompanies();
       } catch (err) {
           alert("Ocorreu um erro ao processar a renovação.");
       } finally {
           setProcessingId(null);
       }
    }
  };

  const handleImpersonate = async (id: string, name: string) => {
      if(window.confirm(`Acessar painel da empresa "${name}"?`)) {
          try {
            const { user, company } = await authService.impersonate(id);
            login(user, company);
          } catch(err: any) { alert(err.message); }
      }
  };

  const active = companies.filter(c => c.status === CompanyStatus.ACTIVE);
  const blocked = companies.filter(c => c.status !== CompanyStatus.ACTIVE);
  const mrr = active.reduce((acc, c) => acc + (PLAN_MRR[c.plan] || 0), 0);
  const expiringSoon = active.filter(c => Math.ceil((c.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) <= 7).length;

  if (loading && companies.length === 0) return <div className="text-center p-20 animate-pulse text-gray-400">Carregando Administração...</div>;

  return (
    <div className="space-y-8">
      <div className="flex gap-4 border-b border-gray-200 pb-4">
          <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg font-bold transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-500 border'}`}>
              Oficinas Cadastradas
          </button>
          <button onClick={() => setView('chat')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${view === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-500 border'}`}>
              <MessageSquare size={18}/> Central de Suporte
          </button>
      </div>

      {view === 'list' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="MRR Mensal" value={formatCurrency(mrr)} icon={DollarSign} colorBg="bg-green-100" colorText="text-green-600" />
                <StatsCard title="Total Oficinas" value={companies.length} icon={Users} colorBg="bg-blue-100" colorText="text-blue-600" />
                <StatsCard title="Taxa Bloqueio" value={`${((blocked.length/companies.length)*100 || 0).toFixed(0)}%`} icon={TrendingUp} colorBg="bg-red-100" colorText="text-red-600" />
                <StatsCard title="Próximas Expirações" value={expiringSoon} icon={AlertTriangle} colorBg="bg-orange-100" colorText="text-orange-600" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                   <Shield className="text-blue-600" /> Gestão de Licenças e Ativação
                </h3>
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Empresa</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiração</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {companies.map((c) => {
                        const daysLeft = Math.ceil((c.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft <= 0;
                        const isBusy = processingId === c.id;

                        return (
                        <tr key={c.id} className={isBusy ? 'opacity-50 pointer-events-none' : ''}>
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{c.name}</div>
                                <div className="text-xs text-gray-400">{c.document} | {c.email}</div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                                <span className={isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}>
                                    {isExpired ? 'VENCIDA' : `${daysLeft} dias`}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${c.status === CompanyStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 flex justify-center gap-2">
                                {isBusy ? (
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                ) : (
                                    <>
                                        <button onClick={() => handleImpersonate(c.id, c.name)} title="Entrar no Painel do Cliente" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                            <LogIn size={20}/>
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleRenew30Days(c.id)} 
                                            title="Renovar +30 Dias" 
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm shadow-green-200"
                                        >
                                            <Clock size={16}/> Liberar +30 Dias
                                        </button>

                                        <button 
                                            onClick={() => handleStatusChange(c.id, c.status === CompanyStatus.ACTIVE ? CompanyStatus.BLOCKED : CompanyStatus.ACTIVE)} 
                                            title={c.status === CompanyStatus.ACTIVE ? "Bloquear Oficina" : "Desbloquear Oficina"} 
                                            className={`p-2 rounded-lg transition-colors border border-transparent ${c.status === CompanyStatus.ACTIVE ? 'text-red-400 hover:bg-red-50 hover:border-red-100' : 'text-green-400 hover:bg-green-50 hover:border-green-100'}`}
                                        >
                                            {c.status === CompanyStatus.ACTIVE ? <Ban size={20}/> : <CheckCircle size={20}/>}
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            </div>
          </>
      ) : (
          <SupportChat companies={companies} />
      )}
    </div>
  );
};
