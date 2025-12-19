
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { dbService } from './mockDb';
import { ServiceOrder, Customer, OSStatus, Product, OSItem, Company, Transaction, TransactionType, TeamMember, Checklist, ChecklistStatus, Appointment, AppointmentStatus } from './types';
import { Plus, Search, Car, FileText, CheckCircle, Clock, DollarSign, XCircle, Ban, MessageCircle, Package, Trash2, Wrench, Printer, Calendar, History, Columns, List, Save, Building2, MapPin, TrendingUp, TrendingDown, User, UserCheck, ClipboardCheck, Fuel, ArrowRight, Trophy, BarChart3, PieChart, Upload, FileSpreadsheet, AlertCircle, Check, Loader2, Pencil, ArrowLeft, Download, Filter } from 'lucide-react';

const openWhatsApp = (phone: string, message: string) => {
   const cleanPhone = phone.replace(/\D/g, '');
   const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
   const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
   window.open(url, '_blank');
};

const formatCurrency = (val: number) => {
   return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const printOrder = (os: ServiceOrder, customer: Customer | undefined, company: Company | null, checklist: Checklist | null) => {
   const printWindow = window.open('', '_blank', 'width=800,height=600');
   if (!printWindow) return;

   const dateStr = new Date(os.createdAt).toLocaleDateString();
   const itemsHtml = os.items && os.items.length > 0 
      ? os.items.map(item => `
         <tr>
            <td>${item.name}</td>
            <td style="text-align: center">${item.quantity}</td>
            <td style="text-align: right">${formatCurrency(item.unitPrice)}</td>
            <td style="text-align: right">${formatCurrency(item.total)}</td>
         </tr>
      `).join('') 
      : `<tr><td colspan="4" style="text-align: center; color: #999;">Nenhum produto/peça listado.</td></tr>`;

   let checklistHtml = '';
   if (checklist) {
      const fuelLabels = ['Vazio', '1/4', '1/2', '3/4', 'Cheio'];
      const itemsList = checklist.items.map(i => {
         let color = '#333';
         let statusLabel = 'OK';
         if(i.status === ChecklistStatus.DAMAGED) { color = 'red'; statusLabel = 'AVARIADO'; }
         if(i.status === ChecklistStatus.MISSING) { color = 'orange'; statusLabel = 'AUSENTE'; }
         if(i.status === ChecklistStatus.NA) { color = '#999'; statusLabel = 'N/A'; }
         return `<div style="margin-bottom: 5px;"><strong>${i.name}:</strong> <span style="color:${color}; font-weight:bold">${statusLabel}</span></div>`;
      }).join('');

      checklistHtml = `
         <div class="box" style="margin-top: 20px;">
            <h3>Vistoria de Entrada</h3>
            <p><strong>Nível de Combustível:</strong> ${fuelLabels[checklist.fuelLevel]}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">${itemsList}</div>
         </div>
      `;
   }

   const htmlContent = `<html><body style="font-family:sans-serif; padding:40px;">
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid #333; padding-bottom:20px; margin-bottom:30px;">
         <div><h1>${company?.name || 'Oficina'}</h1><p>${company?.document || ''}</p></div>
         <div style="text-align:right;"><h2>ORDEM DE SERVIÇO</h2><p>#${os.id.split('-')[1]}</p><p>${dateStr}</p></div>
      </div>
      <div style="display:flex; gap:40px; margin-bottom:30px;">
         <div style="flex:1; background:#f9f9f9; padding:15px;"><h3>Cliente</h3><p>${customer?.name || os.customerName}</p></div>
         <div style="flex:1; background:#f9f9f9; padding:15px;"><h3>Veículo</h3><p>${os.vehicle}</p></div>
      </div>
      <table style="width:100%; border-collapse:collapse;">
         <thead><tr style="background:#eee;"><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
         <tbody>${itemsHtml}</tbody>
      </table>
      <div style="text-align:right; margin-top:30px; font-size:18px;"><strong>TOTAL: ${formatCurrency(os.totalValue)}</strong></div>
      ${checklistHtml}
      <script>window.onload = function() { window.print(); }</script>
   </body></html>`;
   printWindow.document.write(htmlContent);
   printWindow.document.close();
};

const StatsCard: React.FC<{ title: string; value: string | number; icon: any; color: string; subtext?: string }> = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-4 rounded-full ${color} bg-opacity-10`}>
      <Icon className={color} size={24} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const FinancialView: React.FC<{ companyId: string }> = ({ companyId }) => {
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
   const [showModal, setShowModal] = useState(false);
   const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
   
   const [newTrans, setNewTrans] = useState({
      description: '',
      amount: '',
      type: TransactionType.EXPENSE,
      category: 'Despesa Geral'
   });

   const load = async () => {
      const [trans, orders] = await Promise.all([
         dbService.getTransactions(companyId),
         dbService.getServiceOrders(companyId)
      ]);
      setTransactions(trans);
      setServiceOrders(orders.filter(o => o.status === OSStatus.COMPLETED));
   };

   useEffect(() => { load(); }, [companyId]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(newTrans.amount);
      if(isNaN(amount) || amount <= 0) return alert("Insira um valor válido.");

      await dbService.createTransaction({
         companyId,
         description: newTrans.description,
         amount: amount,
         type: newTrans.type,
         category: newTrans.category,
         date: Date.now()
      });
      setShowModal(false);
      setNewTrans({ description: '', amount: '', type: TransactionType.EXPENSE, category: 'Despesa Geral' });
      load();
   };

   const handleDelete = async (id: string) => {
      if(window.confirm("Apagar este registro permanentemente?")) {
         await dbService.deleteTransaction(id);
         load();
      }
   };

   // Logic to aggregate OS Revenue + Manual Income - Manual Expenses
   const osIncomeTotal = serviceOrders.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
   const manualIncomeTotal = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
   const expenseTotal = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
   
   const netProfit = (osIncomeTotal + manualIncomeTotal) - expenseTotal;

   return (
      <div className="space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Gestão Financeira</h3>
               <p className="text-sm text-slate-500">Controle total de entradas (OS + Manuais) e saídas da oficina.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
               <Plus size={20} /> Novo Lançamento Manual
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receita de Serviços</p>
               <h4 className="text-2xl font-black text-slate-800">{formatCurrency(osIncomeTotal)}</h4>
               <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1"><Check size={10}/> {serviceOrders.length} OS Concluídas</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Entradas Avulsas</p>
               <h4 className="text-2xl font-black text-slate-800">{formatCurrency(manualIncomeTotal)}</h4>
               <p className="text-[10px] text-slate-400 font-bold mt-1">Lançamentos manuais</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Despesas</p>
               <h4 className="text-2xl font-black text-red-600">-{formatCurrency(expenseTotal)}</h4>
               <p className="text-[10px] text-slate-400 font-bold mt-1">Custos fixos e variáveis</p>
            </div>
            <div className={`p-6 rounded-2xl shadow-lg border ${netProfit >= 0 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
               <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Saldo Líquido</p>
               <h4 className="text-2xl font-black">{formatCurrency(netProfit)}</h4>
               <p className="text-[10px] font-bold mt-1 opacity-90">{netProfit >= 0 ? 'Resultado Positivo' : 'Atenção: Saldo Negativo'}</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
               <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Registros de Movimentação</h3>
               <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 px-2">FILTRAR:</span>
                  <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-white border-none text-xs font-bold p-1.5 rounded focus:ring-0 cursor-pointer" />
               </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="min-w-full">
                  <thead className="bg-slate-50">
                     <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-tighter">Data</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tipo / Categoria</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-tighter">Descrição</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-tighter">Valor</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {/* Combine OS and Manual for a unified ledger view */}
                     {[
                        ...serviceOrders.map(o => ({ 
                           id: o.id, date: o.updatedAt, description: `OS #${o.id.split('-')[1]} - ${o.customerName}`, 
                           category: 'Serviço Prestado', type: TransactionType.INCOME, amount: o.totalValue, isOS: true 
                        })),
                        ...transactions.map(t => ({ ...t, isOS: false }))
                     ].sort((a,b) => b.date - a.date).map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                              {new Date(item.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${item.type === TransactionType.INCOME ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {item.category}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-xs font-medium text-slate-700">
                              {item.description}
                           </td>
                           <td className={`px-6 py-4 text-right whitespace-nowrap text-sm font-black ${item.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                              {item.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(item.amount)}
                           </td>
                           <td className="px-6 py-4 text-center">
                              {!item.isOS ? (
                                 <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                 </button>
                              ) : (
                                 <span className="text-[8px] font-bold text-slate-300 uppercase italic">Registro OS</span>
                              )}
                           </td>
                        </tr>
                     ))}
                     {transactions.length === 0 && serviceOrders.length === 0 && (
                        <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic">Nenhuma movimentação registrada.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {showModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
               <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Lançamento Manual</h3>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24}/></button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-5">
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                           type="button" 
                           onClick={() => setNewTrans({...newTrans, type: TransactionType.INCOME})} 
                           className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${newTrans.type === TransactionType.INCOME ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'bg-white border-slate-100 text-slate-400'}`}
                        >Entrada</button>
                        <button 
                           type="button" 
                           onClick={() => setNewTrans({...newTrans, type: TransactionType.EXPENSE})} 
                           className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${newTrans.type === TransactionType.EXPENSE ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100' : 'bg-white border-slate-100 text-slate-400'}`}
                        >Saída</button>
                     </div>
                     
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Registro</label>
                        <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ex: Compra de Ferramentas..." required value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor (R$)</label>
                           <input type="number" step="0.01" className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="0,00" required value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                           <select className="w-full bg-slate-50 border-none p-3 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500" value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})}>
                              <option>Despesa Geral</option>
                              <option>Aluguel / Fixos</option>
                              <option>Peças / Insumos</option>
                              <option>Pessoal / Equipe</option>
                              <option>Investimento</option>
                              <option>Venda Direta</option>
                              <option>Outros</option>
                           </select>
                        </div>
                     </div>

                     <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 mt-4 uppercase tracking-widest text-xs">
                        Confirmar Registro
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

const SimpleBarChart: React.FC<{ data: { label: string, value: number }[] }> = ({ data }) => {
   const max = Math.max(...data.map(d => d.value), 1);
   return (
      <div className="flex items-end justify-between h-40 gap-2 pt-4">
         {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center flex-1 group">
               <div className="relative w-full flex justify-end flex-col items-center h-full">
                   <div 
                     className="w-full max-w-[30px] bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all relative group-hover:scale-110 origin-bottom duration-300"
                     style={{ height: `${(d.value / max) * 100}%` }}
                   >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                        {formatCurrency(d.value)}
                     </div>
                   </div>
               </div>
               <span className="text-[10px] text-gray-400 mt-2 font-medium">{d.label}</span>
            </div>
         ))}
      </div>
   );
};

const SimpleDonutChart: React.FC<{ labor: number, parts: number }> = ({ labor, parts }) => {
   const total = labor + parts || 1;
   const laborPercent = (labor / total) * 100;
   const partsPercent = (parts / total) * 100;

   return (
      <div className="flex items-center gap-6">
         <div className="relative w-32 h-32 rounded-full border-[12px] border-blue-500 transform rotate-[-90deg]" 
              style={{ background: `conic-gradient(#3b82f6 ${laborPercent}%, #f97316 0)` }}>
            <div className="absolute inset-0 m-[12px] bg-white rounded-full flex items-center justify-center flex-col transform rotate-[90deg]">
               <span className="text-xs text-gray-400">Total</span>
               <span className="font-bold text-sm text-gray-800">{formatCurrency(total)}</span>
            </div>
         </div>
         <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
               <div><p className="text-xs text-gray-500">Mão de Obra</p><p className="font-bold text-sm">{laborPercent.toFixed(1)}%</p></div>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
               <div><p className="text-xs text-gray-500">Peças</p><p className="font-bold text-sm">{partsPercent.toFixed(1)}%</p></div>
            </div>
         </div>
      </div>
   );
}

const ReportsView: React.FC<{ companyId: string }> = ({ companyId }) => {
   const { company } = useAuth();
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');

   useEffect(() => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
   }, []);

   const generateFinancialReport = async () => {
      const [transactions, orders] = await Promise.all([
         dbService.getTransactions(companyId),
         dbService.getServiceOrders(companyId)
      ]);
      alert("Relatório Gerado com Sucesso (Simulação PDF)");
   };

   return (
      <div className="space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
               <FileText className="text-blue-600" /> Relatórios do Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="border border-slate-100 rounded-2xl p-6 text-center">
                  <div className="bg-blue-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-blue-600"><DollarSign size={32}/></div>
                  <h4 className="font-bold text-slate-800">Financeiro Completo</h4>
                  <button onClick={generateFinancialReport} className="mt-4 w-full bg-slate-800 text-white py-2 rounded-xl font-bold">Gerar PDF</button>
               </div>
            </div>
         </div>
      </div>
   );
};

const HomeView: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [data, setData] = useState<any>(null);
  const { company } = useAuth();

  useEffect(() => {
    dbService.getStats(companyId).then(setData);
  }, [companyId]);

  if (!data) return <div className="p-10 text-center text-gray-400">Carregando painel de indicadores...</div>;

  const { summary, history, split, ranking } = data;
  const goal = company?.monthlyGoal || 10000;
  const progress = Math.min((summary.revenue / goal) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatsCard title="Receita Bruta" value={formatCurrency(summary.revenue)} icon={DollarSign} color="text-green-600" subtext={`${progress.toFixed(0)}% da meta`} />
         <StatsCard title="OS Pendentes" value={summary.pendingOS} icon={Clock} color="text-yellow-600" subtext="Aguardando ação" />
         <StatsCard title="OS Finalizadas" value={summary.completedOS} icon={CheckCircle} color="text-blue-600" subtext="No período" />
         <StatsCard title="Ticket Médio" value={formatCurrency(summary.avgTicket)} icon={TrendingUp} color="text-purple-600" subtext="Por OS concluída" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-6 uppercase text-sm tracking-widest"><BarChart3 size={18} className="text-blue-600"/> Histórico de Vendas</h4>
            <SimpleBarChart data={history} />
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-6 uppercase text-sm tracking-widest"><PieChart size={18} className="text-orange-500"/> Mix de Receita</h4>
            <div className="flex justify-center h-40 items-center"><SimpleDonutChart labor={split.labor} parts={split.parts} /></div>
         </div>
      </div>
    </div>
  );
};

const CustomersView: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCust, setNewCust] = useState({ name: '', phone: '', vehicleModel: '', vehiclePlate: '' });

  const load = () => dbService.getCustomers(companyId).then(setCustomers);
  useEffect(() => { load(); }, [companyId]);

  const handleEdit = (cust: Customer) => {
      setEditingId(cust.id);
      setNewCust({ name: cust.name, phone: cust.phone, vehicleModel: cust.vehicleModel, vehiclePlate: cust.vehiclePlate });
      setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) { await dbService.updateCustomer(editingId, newCust); } 
    else { await dbService.createCustomer({ ...newCust, companyId }); }
    setShowModal(false);
    setNewCust({ name: '', phone: '', vehicleModel: '', vehiclePlate: '' });
    setEditingId(null);
    load();
  };

  const filteredCustomers = customers.filter(c => 
     c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Base de Clientes</h3>
         <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
               <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar..." />
            </div>
            <button onClick={() => { setEditingId(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"><Plus size={18} /> Novo</button>
         </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="min-w-full">
           <thead className="bg-slate-50">
              <tr>
                 <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                 <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</th>
                 <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo</th>
                 <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map(c => (
                 <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{c.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-bold">{c.phone}</td>
                    <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black uppercase text-slate-600">{c.vehicleModel} • {c.vehiclePlate}</span></td>
                    <td className="px-6 py-4 flex gap-2">
                       <button onClick={() => handleEdit(c)} className="text-blue-500 bg-blue-50 p-2 rounded-lg hover:bg-blue-100"><Pencil size={16}/></button>
                       <button onClick={() => openWhatsApp(c.phone, `Olá ${c.name}!`)} className="text-green-500 bg-green-50 p-2 rounded-lg hover:bg-green-100"><MessageCircle size={16}/></button>
                    </td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Cadastro de Cliente</h3>
              <form onSubmit={handleSave} className="space-y-4">
                 <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-bold" placeholder="Nome Completo" required value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
                 <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-bold" placeholder="WhatsApp" required value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
                 <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-bold" placeholder="Veículo" required value={newCust.vehicleModel} onChange={e => setNewCust({...newCust, vehicleModel: e.target.value})} />
                 <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-bold uppercase" placeholder="Placa" required value={newCust.vehiclePlate} onChange={e => setNewCust({...newCust, vehiclePlate: e.target.value})} />
                 <div className="flex gap-2 justify-end mt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-100 uppercase text-[10px]">Salvar</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const OSView: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { company } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mechanics, setMechanics] = useState<TeamMember[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ServiceOrder>>({});
  const [selProd, setSelProd] = useState('');
  const [selQty, setSelQty] = useState(1);

  const loadData = async () => {
     const [o, c, p, m] = await Promise.all([dbService.getServiceOrders(companyId), dbService.getCustomers(companyId), dbService.getProducts(companyId), dbService.getTeamMembers(companyId)]);
     setOrders(o.sort((a,b) => b.createdAt - a.createdAt));
     setCustomers(c);
     setProducts(p);
     setMechanics(m);
  };

  useEffect(() => { loadData(); }, [companyId]);

  const handleSave = async () => {
     if (!formData.customerId || !formData.description) return alert("Preencha os campos obrigatórios.");
     const cust = customers.find(c => c.id === formData.customerId);
     const mech = mechanics.find(m => m.id === formData.mechanicId);
     const laborValue = Number(formData.laborValue) || 0;
     const partsTotal = formData.items?.reduce((acc, i) => acc + i.total, 0) || 0;

     const data = {
        companyId, customerId: formData.customerId, customerName: cust?.name || 'Cliente',
        vehicle: formData.vehicle || (cust ? `${cust.vehicleModel} (${cust.vehiclePlate})` : ''),
        description: formData.description, status: formData.status || OSStatus.PENDING,
        mechanicId: formData.mechanicId, mechanicName: mech?.name, laborValue,
        items: formData.items || [], totalValue: laborValue + partsTotal
     };

     if (editingId) { await dbService.updateServiceOrder(editingId, data); } 
     else { await dbService.createServiceOrder(data); }
     setView('list');
     loadData();
  };

  const handleAddItem = () => {
     const p = products.find(x => x.id === selProd);
     if (p) {
        const newItem: OSItem = { productId: p.id, name: p.name, quantity: selQty, unitPrice: p.sellPrice, total: p.sellPrice * selQty };
        setFormData({ ...formData, items: [...(formData.items || []), newItem] });
        setSelProd('');
        setSelQty(1);
     }
  };

  if (view === 'list') {
     return (
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ordens de Serviço</h3>
              <div className="flex gap-2 w-full md:w-auto">
                 <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full md:w-64 px-4 py-2 border rounded-xl" placeholder="Pesquisar OS..." />
                 <button onClick={() => { setEditingId(null); setFormData({status: OSStatus.PENDING, items: [], laborValue: 0}); setView('form'); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">+ Nova OS</button>
              </div>
           </div>
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="min-w-full">
                 <thead className="bg-slate-50">
                    <tr><th>#</th><th>Cliente</th><th>Status</th><th className="text-right">Total</th><th>Ações</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 text-sm">
                    {orders.map(os => (
                       <tr key={os.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-400">#{os.id.split('-')[1]}</td>
                          <td className="px-6 py-4 font-bold">{os.customerName}</td>
                          <td className="px-6 py-4 uppercase font-black text-[9px]">{os.status}</td>
                          <td className="px-6 py-4 text-right font-black text-blue-600">{formatCurrency(os.totalValue)}</td>
                          <td className="px-6 py-4 text-center">
                             <button onClick={() => { setEditingId(os.id); setFormData(os); setView('form'); }} className="text-blue-500 mr-2"><Pencil size={18}/></button>
                             <button onClick={() => printOrder(os, customers.find(c=>c.id===os.customerId), company, null)} className="text-slate-400"><Printer size={18}/></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
     );
  }

  return (
     <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-4">
           <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-800 transition-colors"><ArrowLeft size={24} /></button>
           <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingId ? `Edição OS #${editingId.split('-')[1]}` : 'Nova Ordem de Serviço'}</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informações Gerais</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 uppercase">Cliente</label>
                       <select className="w-full bg-slate-50 border-none p-3 rounded-xl text-xs font-bold" value={formData.customerId || ''} onChange={e => { const c = customers.find(x => x.id === e.target.value); setFormData({ ...formData, customerId: e.target.value, vehicle: c ? `${c.vehicleModel} (${c.vehiclePlate})` : '' }); }}>
                          <option value="">Selecione um cliente...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 uppercase">Veículo</label>
                        <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-xs font-bold" value={formData.vehicle || ''} onChange={e => setFormData({...formData, vehicle: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 uppercase">Relato do Problema / Serviço</label>
                        <textarea className="w-full bg-slate-50 border-none p-3 rounded-xl text-xs font-bold" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                    </div>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Peças Aplicadas</h4>
                 <div className="flex gap-2 mb-4">
                    <select className="flex-1 bg-slate-50 border-none p-3 rounded-xl text-xs font-bold" value={selProd} onChange={e => setSelProd(e.target.value)}>
                       <option value="">Buscar peça no estoque...</option>
                       {products.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.sellPrice)}</option>)}
                    </select>
                    <input type="number" className="w-20 bg-slate-50 border-none p-3 rounded-xl text-xs font-bold" value={selQty} onChange={e => setSelQty(Number(e.target.value))} />
                    <button onClick={handleAddItem} className="bg-green-500 text-white p-3 rounded-xl"><Plus size={20}/></button>
                 </div>
                 <table className="w-full text-xs">
                    <tbody>
                       {formData.items?.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0"><td className="py-3 font-bold">{item.name}</td><td className="py-3 text-center">{item.quantity}un</td><td className="py-3 text-right font-bold text-slate-400">{formatCurrency(item.total)}</td></tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
           <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 h-fit">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Resumo Financeiro</h4>
              <div className="space-y-4 mb-8">
                 <div className="flex justify-between font-bold text-sm text-slate-400"><span>Mão de Obra</span><input type="number" className="w-24 text-right bg-slate-50 border-none p-1 rounded font-black text-slate-800" value={formData.laborValue} onChange={e => setFormData({...formData, laborValue: Number(e.target.value)})} /></div>
                 <div className="flex justify-between font-bold text-sm text-slate-400"><span>Peças</span><span>{formatCurrency(formData.items?.reduce((a,b)=>a+b.total, 0) || 0)}</span></div>
                 <div className="flex justify-between font-black text-xl text-slate-800 pt-4 border-t"><span>TOTAL</span><span className="text-blue-600">{formatCurrency((Number(formData.laborValue) || 0) + (formData.items?.reduce((a,b)=>a+b.total, 0) || 0))}</span></div>
              </div>
              <div className="mb-6">
                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Status da OS</label>
                 <select className="w-full bg-slate-100 border-none p-4 rounded-2xl font-black text-xs uppercase" value={formData.status || OSStatus.PENDING} onChange={e => setFormData({...formData, status: e.target.value as OSStatus})}>
                    <option value={OSStatus.PENDING}>Orçamento</option>
                    <option value={OSStatus.IN_PROGRESS}>Em Execução</option>
                    <option value={OSStatus.WAITING_PARTS}>Peças</option>
                    <option value={OSStatus.COMPLETED}>Finalizada</option>
                    <option value={OSStatus.CANCELED}>Cancelada</option>
                 </select>
              </div>
              <button onClick={handleSave} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">Gravar Ordem de Serviço</button>
           </div>
        </div>
     </div>
  );
};

export const ClientDashboard: React.FC<{ page: string, onNavigate: (page: string) => void }> = ({ page, onNavigate }) => {
  const { company } = useAuth();
  const isExpired = company ? company.expiresAt < Date.now() : false;
  if (isExpired && page !== 'dashboard' && page !== 'settings') return <div className="text-center p-20 font-black text-red-600 uppercase tracking-widest">Acesso Expirado - Renove sua Licença</div>;
  if (page === 'dashboard') return <HomeView companyId={company!.id} />;
  if (page === 'customers') return <CustomersView companyId={company!.id} />;
  if (page === 'os') return <OSView companyId={company!.id} />;
  if (page === 'financial') return <FinancialView companyId={company!.id} />; 
  if (page === 'reports') return <ReportsView companyId={company!.id} />;
  return null;
};
