import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/mockDb';
import { ServiceOrder, Customer, OSStatus, Product, OSItem, Company, Transaction, TransactionType, TeamMember, Checklist, ChecklistStatus, Appointment, AppointmentStatus } from '../types';
import { Plus, Search, Car, FileText, CheckCircle, Clock, DollarSign, XCircle, Ban, MessageCircle, Package, Trash2, Wrench, Printer, Calendar, History, Columns, List, Save, Building2, MapPin, TrendingUp, TrendingDown, User, UserCheck, ClipboardCheck, Fuel, ArrowRight, Trophy, BarChart3, PieChart, Upload, FileSpreadsheet, AlertCircle, Check, Loader2, Pencil, ArrowLeft, Download } from 'lucide-react';

const openWhatsApp = (phone: string, message: string) => {
   const cleanPhone = phone.replace(/\D/g, '');
   const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
   const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
   window.open(url, '_blank');
};

const formatCurrency = (val: number) => {
   return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const parseCSV = (text: string) => {
   const lines = text.split('\n').filter(l => l.trim());
   if (lines.length < 2) return null;

   const headers = lines[0].split(',').map(h => h.replace(/['"]+/g, '').trim());
   
   const data = lines.slice(1).map(line => {
       const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
       return values.map(v => v.replace(/['"]+/g, '').trim());
   });

   return { headers, data };
};

const printReport = (title: string, period: string, contentHtml: string, company: Company | null) => {
   const printWindow = window.open('', '_blank', 'width=900,height=700');
   if (!printWindow) return;

   const html = `
      <!DOCTYPE html>
      <html>
      <head>
         <title>${title}</title>
         <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .header p { margin: 2px 0; color: #666; }
            
            .report-title { text-align: center; margin-bottom: 30px; }
            .report-title h2 { margin: 0; font-size: 16px; color: #3b82f6; }
            .report-title span { background: #f0f0f0; padding: 4px 12px; border-radius: 20px; font-weight: bold; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f9fafb; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #666; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .text-green { color: green; }
            .text-red { color: red; }
            
            .summary-box { display: flex; justify-content: flex-end; margin-top: 20px; }
            .summary-table { width: 300px; }
            .summary-table td { border: none; padding: 4px; }
            .summary-total { border-top: 2px solid #333 !important; font-size: 14px; font-weight: bold; }

            .footer { margin-top: 50px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
            
            @media print {
               body { padding: 0; }
               button { display: none; }
            }
         </style>
      </head>
      <body>
         <div class="header">
            <h1>${company?.name || 'Oficina Mecânica'}</h1>
            <p>${company?.document || ''} | ${company?.email || ''}</p>
            <p>${company?.address || ''}</p>
         </div>

         <div class="report-title">
            <h2>${title}</h2>
            <p>Período: ${period}</p>
         </div>

         ${contentHtml}

         <div class="footer">
            Documento gerado em ${new Date().toLocaleString()} via OficinaPro SaaS
         </div>

         <script>
            window.onload = function() { window.print(); }
         </script>
      </body>
      </html>
   `;

   printWindow.document.write(html);
   printWindow.document.close();
}

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
         
         return `<div style="margin-bottom: 5px;">
            <strong>${i.name}:</strong> <span style="color:${color}; font-weight:bold">${statusLabel}</span>
            ${i.notes ? `<span style="font-size:12px; color:#666">(${i.notes})</span>` : ''}
         </div>`;
      }).join('');

      checklistHtml = `
         <div class="box" style="margin-top: 20px;">
            <h3>Vistoria de Entrada</h3>
            <p><strong>Nível de Combustível:</strong> ${fuelLabels[checklist.fuelLevel] || 'Não informado'}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
               ${itemsList}
            </div>
            ${checklist.notes ? `<p style="margin-top:10px;"><strong>Obs. Vistoria:</strong> ${checklist.notes}</p>` : ''}
         </div>
      `;
   }

   const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
         <title>Ordem de Serviço #${os.id}</title>
         <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-area h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .logo-area p { margin: 5px 0 0; font-size: 14px; color: #666; }
            .os-info { text-align: right; }
            .os-info h2 { margin: 0; color: #333; }
            .os-info p { margin: 5px 0 0; font-size: 14px; }
            
            .columns { display: flex; gap: 40px; margin-bottom: 30px; }
            .col { flex: 1; }
            .box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; height: 100%; }
            .box h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #555; }
            .box p { margin: 5px 0; font-size: 14px; }
            .box strong { color: #000; }

            table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; border-bottom: 2px solid #ddd; padding: 10px; font-size: 12px; text-transform: uppercase; color: #666; }
            td { border-bottom: 1px solid #eee; padding: 10px; font-size: 14px; }
            
            .totals { float: right; width: 250px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
            .row.final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }

            .footer { clear: both; margin-top: 80px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #888; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-line { width: 40%; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 14px; }
            
            @media print {
               body { padding: 0; }
               .box { border: 1px solid #ccc; }
            }
         </style>
      </head>
      <body>
         <div class="header">
            <div class="logo-area">
               <h1>${company?.name || 'Oficina Mecânica'}</h1>
               <p>${company?.document || 'Documento não informado'}</p>
               <p>${company?.email || ''} | ${company?.phone || ''}</p>
               <p>${company?.address || ''}</p>
            </div>
            <div class="os-info">
               <h2>ORDEM DE SERVIÇO</h2>
               <p><strong>Nº:</strong> ${os.id.split('-')[1]}</p>
               <p><strong>Data:</strong> ${dateStr}</p>
               <p><strong>Status:</strong> ${os.status}</p>
               ${os.mechanicName ? `<p><strong>Mecânico:</strong> ${os.mechanicName}</p>` : ''}
            </div>
         </div>

         <div class="columns">
            <div class="col">
               <div class="box">
                  <h3>Dados do Cliente</h3>
                  <p><strong>Nome:</strong> ${customer?.name || os.customerName}</p>
                  <p><strong>Telefone:</strong> ${customer?.phone || 'Não informado'}</p>
               </div>
            </div>
            <div class="col">
               <div class="box">
                  <h3>Veículo</h3>
                  <p><strong>Modelo:</strong> ${os.vehicle}</p>
                  <p><strong>Descrição:</strong> ${os.description}</p>
               </div>
            </div>
         </div>

         <h3>Peças e Serviços</h3>
         <table>
            <thead>
               <tr>
                  <th>Descrição</th>
                  <th style="text-align: center; width: 50px;">Qtd</th>
                  <th style="text-align: right; width: 100px;">Valor Un.</th>
                  <th style="text-align: right; width: 100px;">Total</th>
               </tr>
            </thead>
            <tbody>
               ${itemsHtml}
            </tbody>
         </table>

         <div class="totals">
            <div class="row">
               <span>Mão de Obra:</span>
               <span>${formatCurrency(os.laborValue || 0)}</span>
            </div>
            <div class="row">
               <span>Total Peças:</span>
               <span>${formatCurrency((os.totalValue || 0) - (os.laborValue || 0))}</span>
            </div>
            <div class="row final">
               <span>TOTAL:</span>
               <span>${formatCurrency(os.totalValue || 0)}</span>
            </div>
         </div>
         
         ${checklistHtml}

         <div class="signatures">
            <div class="sig-line">
               Assinatura da Oficina
            </div>
            <div class="sig-line">
               Assinatura do Cliente
            </div>
         </div>

         <div class="footer">
            <p>${company?.warrantyTerms || 'Garantia de 90 dias sobre as peças e mão de obra aqui executadas.'}</p>
            <p>Gerado via OficinaPro SaaS</p>
         </div>

         <script>
            window.onload = function() { window.print(); }
         </script>
      </body>
      </html>
   `;

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
              style={{ 
                 background: `conic-gradient(#3b82f6 ${laborPercent}%, #f97316 0)` 
              }}>
            <div className="absolute inset-0 m-[12px] bg-white rounded-full flex items-center justify-center flex-col transform rotate-[90deg]">
               <span className="text-xs text-gray-400">Total</span>
               <span className="font-bold text-sm text-gray-800">{formatCurrency(total)}</span>
            </div>
         </div>
         <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
               <div>
                  <p className="text-xs text-gray-500">Mão de Obra</p>
                  <p className="font-bold text-sm">{laborPercent.toFixed(1)}%</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
               <div>
                  <p className="text-xs text-gray-500">Peças</p>
                  <p className="font-bold text-sm">{partsPercent.toFixed(1)}%</p>
               </div>
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

   const getRangeLabel = () => {
      if(!startDate || !endDate) return 'Período Completo';
      return `${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`;
   };

   const generateFinancialReport = async () => {
      if(!startDate || !endDate) return alert("Selecione o período");
      
      const [transactions, orders] = await Promise.all([
         dbService.getTransactions(companyId),
         dbService.getServiceOrders(companyId)
      ]);

      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

      const transFiltered = transactions.filter(t => t.date >= startMs && t.date <= endMs);
      const ordersFiltered = orders.filter(o => o.status === OSStatus.COMPLETED && o.updatedAt >= startMs && o.updatedAt <= endMs);

      const revenues = {
         services: ordersFiltered.reduce((acc, o) => acc + o.totalValue, 0),
         other: transFiltered.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0)
      };
      
      const expensesByCategory: Record<string, number> = {};
      transFiltered.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
         expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
      const totalExpenses = Object.values(expensesByCategory).reduce((a,b) => a+b, 0);

      const totalRevenue = revenues.services + revenues.other;
      const balance = totalRevenue - totalExpenses;

      const html = `
         <table>
            <thead>
               <tr>
                  <th>Descrição / Categoria</th>
                  <th class="text-right">Tipo</th>
                  <th class="text-right">Valor</th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td class="font-bold">Receita de Serviços (OS)</td>
                  <td class="text-right text-green">Entrada</td>
                  <td class="text-right font-bold">${formatCurrency(revenues.services)}</td>
               </tr>
               <tr>
                  <td class="font-bold">Outras Receitas</td>
                  <td class="text-right text-green">Entrada</td>
                  <td class="text-right font-bold">${formatCurrency(revenues.other)}</td>
               </tr>
               <tr><td colspan="3" style="background:#f0f0f0;"><strong>Despesas Operacionais</strong></td></tr>
               ${Object.entries(expensesByCategory).map(([cat, val]) => `
                  <tr>
                     <td>${cat}</td>
                     <td class="text-right text-red">Saída</td>
                     <td class="text-right">${formatCurrency(val)}</td>
                  </tr>
               `).join('')}
            </tbody>
         </table>

         <div class="summary-box">
            <table class="summary-table">
               <tr>
                  <td>Total Receitas:</td>
                  <td class="text-right text-green font-bold">${formatCurrency(totalRevenue)}</td>
               </tr>
               <tr>
                  <td>Total Despesas:</td>
                  <td class="text-right text-red font-bold">-${formatCurrency(totalExpenses)}</td>
               </tr>
               <tr class="summary-total">
                  <td>Resultado Líquido:</td>
                  <td class="text-right ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}">${formatCurrency(balance)}</td>
               </tr>
            </table>
         </div>
      `;

      printReport('Relatório Financeiro (DRE Gerencial)', getRangeLabel(), html, company);
   };

   const generateOSReport = async () => {
      if(!startDate || !endDate) return alert("Selecione o período");
      
      const orders = await dbService.getServiceOrders(companyId);
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

      const filtered = orders.filter(o => o.status === OSStatus.COMPLETED && o.updatedAt >= startMs && o.updatedAt <= endMs);

      if(filtered.length === 0) return alert("Nenhuma OS finalizada neste período.");

      let totalLabor = 0;
      let totalParts = 0;
      let grandTotal = 0;

      const rows = filtered.map(os => {
         const parts = (os.totalValue || 0) - (os.laborValue || 0);
         totalLabor += (os.laborValue || 0);
         totalParts += parts;
         grandTotal += (os.totalValue || 0);

         return `
            <tr>
               <td>${new Date(os.createdAt).toLocaleDateString()}</td>
               <td>#${os.id.split('-')[1]}</td>
               <td>${os.customerName}<br/><span style="font-size:10px;color:#666">${os.vehicle}</span></td>
               <td class="text-right">${formatCurrency(parts)}</td>
               <td class="text-right">${formatCurrency(os.laborValue || 0)}</td>
               <td class="text-right font-bold">${formatCurrency(os.totalValue)}</td>
            </tr>
         `;
      }).join('');

      const html = `
         <table>
            <thead>
               <tr>
                  <th>Data</th>
                  <th>Nº OS</th>
                  <th>Cliente / Veículo</th>
                  <th class="text-right">Peças</th>
                  <th class="text-right">Mão de Obra</th>
                  <th class="text-right">Total</th>
               </tr>
            </thead>
            <tbody>
               ${rows}
            </tbody>
         </table>

         <div class="summary-box">
            <table class="summary-table">
               <tr>
                  <td>Total em Peças:</td>
                  <td class="text-right">${formatCurrency(totalParts)}</td>
               </tr>
               <tr>
                  <td>Total em Mão de Obra:</td>
                  <td class="text-right">${formatCurrency(totalLabor)}</td>
               </tr>
               <tr class="summary-total">
                  <td>Faturamento Total:</td>
                  <td class="text-right">${formatCurrency(grandTotal)}</td>
               </tr>
            </table>
         </div>
      `;

      printReport('Relatório de Serviços e Vendas', getRangeLabel(), html, company);
   };

   const generateInventoryReport = async () => {
      const products = await dbService.getProducts(companyId);
      
      let totalItems = 0;
      let totalCost = 0;
      let totalSale = 0;

      const rows = products.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
         totalItems += p.quantity;
         totalCost += (p.costPrice * p.quantity);
         totalSale += (p.sellPrice * p.quantity);

         return `
            <tr>
               <td>${p.name}</td>
               <td class="text-center">${p.quantity}</td>
               <td class="text-right">${formatCurrency(p.costPrice)}</td>
               <td class="text-right font-bold">${formatCurrency(p.costPrice * p.quantity)}</td>
            </tr>
         `;
      }).join('');

      const html = `
         <table>
            <thead>
               <tr>
                  <th>Produto / Peça</th>
                  <th class="text-center">Qtd Atual</th>
                  <th class="text-right">Custo Unit.</th>
                  <th class="text-right">Custo Total</th>
               </tr>
            </thead>
            <tbody>
               ${rows}
            </tbody>
         </table>

         <div class="summary-box">
            <table class="summary-table">
               <tr>
                  <td>Itens em Estoque:</td>
                  <td class="text-right">${totalItems} un</td>
               </tr>
               <tr class="summary-total">
                  <td>Valor Total (Custo):</td>
                  <td class="text-right">${formatCurrency(totalCost)}</td>
               </tr>
               <tr>
                  <td style="font-size:10px; color:#999">Potencial de Venda:</td>
                  <td class="text-right" style="font-size:10px; color:#999">${formatCurrency(totalSale)}</td>
               </tr>
            </table>
         </div>
      `;

      printReport('Inventário de Estoque', new Date().toLocaleDateString(), html, company);
   };

   return (
      <div className="space-y-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
               <FileText className="text-blue-600" /> Central de Relatórios
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6 flex flex-col md:flex-row items-end gap-4 border border-blue-100">
               <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Data Inicial</label>
                  <input 
                     type="date" 
                     className="w-full border border-blue-200 rounded p-2 text-sm"
                     value={startDate}
                     onChange={e => setStartDate(e.target.value)}
                  />
               </div>
               <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Data Final</label>
                  <input 
                     type="date" 
                     className="w-full border border-blue-200 rounded p-2 text-sm"
                     value={endDate}
                     onChange={e => setEndDate(e.target.value)}
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center">
                  <div className="bg-green-100 p-4 rounded-full mb-4 text-green-600">
                     <DollarSign size={32}/>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Relatório Financeiro</h4>
                  <p className="text-xs text-gray-500 mb-6">
                     DRE Simples contendo receitas de serviços, entradas manuais e despesas categorizadas. Ideal para contabilidade.
                  </p>
                  <button 
                     onClick={generateFinancialReport}
                     className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                     <Printer size={16}/> Gerar PDF
                  </button>
               </div>

               <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center">
                  <div className="bg-blue-100 p-4 rounded-full mb-4 text-blue-600">
                     <Wrench size={32}/>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Relatório de Serviços</h4>
                  <p className="text-xs text-gray-500 mb-6">
                     Listagem detalhada de todas as Ordens de Serviço finalizadas no período, separando Mão de Obra e Peças.
                  </p>
                  <button 
                     onClick={generateOSReport}
                     className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                     <Printer size={16}/> Gerar PDF
                  </button>
               </div>

               <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center">
                  <div className="bg-orange-100 p-4 rounded-full mb-4 text-orange-600">
                     <Package size={32}/>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Balanço de Estoque</h4>
                  <p className="text-xs text-gray-500 mb-6">
                     Posição atual do estoque valorada pelo preço de custo. (Nota: Este relatório ignora o filtro de data, mostrando o estado atual).
                  </p>
                  <button 
                     onClick={generateInventoryReport}
                     className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                     <Printer size={16}/> Gerar PDF
                  </button>
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
         <StatsCard 
            title="Receita do Mês" 
            value={formatCurrency(summary.revenue)} 
            icon={DollarSign} 
            color="text-green-600" 
            subtext={`${progress.toFixed(0)}% da meta mensal`}
         />
         <StatsCard 
            title="OS em Aberto" 
            value={summary.pendingOS} 
            icon={Clock} 
            color="text-yellow-600" 
            subtext="Aguardando ação"
         />
         <StatsCard 
            title="OS Finalizadas" 
            value={summary.completedOS} 
            icon={CheckCircle} 
            color="text-blue-600"
            subtext="Total acumulado" 
         />
         <StatsCard 
            title="Ticket Médio" 
            value={formatCurrency(summary.avgTicket)} 
            icon={TrendingUp} 
            color="text-purple-600" 
            subtext="Por veículo atendido"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
               <h4 className="font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-blue-600"/> Histórico de Faturamento</h4>
               <span className="text-xs text-gray-400">Últimos 6 meses</span>
            </div>
            <SimpleBarChart data={history} />
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
               <h4 className="font-bold text-gray-800 flex items-center gap-2"><PieChart size={20} className="text-orange-500"/> Faturamento por Categoria</h4>
            </div>
            <div className="flex justify-center h-40 items-center">
               <SimpleDonutChart labor={split.labor} parts={split.parts} />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Trophy size={20} className="text-yellow-500"/> Ranking de Mecânicos</h4>
             <div className="space-y-3">
                {ranking.length === 0 ? (
                   <p className="text-sm text-gray-400 text-center py-4">Nenhum dado de produção.</p>
                ) : (
                   ranking.map((r: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                               idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                               idx === 1 ? 'bg-gray-200 text-gray-600' :
                               idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white border text-gray-400'
                            }`}>
                               {idx + 1}
                            </div>
                            <span className="font-medium text-gray-700">{r.name}</span>
                         </div>
                         <span className="font-bold text-gray-900">{formatCurrency(r.value)}</span>
                      </div>
                   ))
                )}
             </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <h4 className="font-bold text-gray-800 mb-4">Meta Mensal</h4>
            
            <div className="flex justify-between items-end mb-2">
               <div>
                  <p className="text-3xl font-bold text-gray-900">{progress.toFixed(0)}%</p>
                  <p className="text-sm text-gray-500">do objetivo de {formatCurrency(goal)}</p>
               </div>
               <div className={`p-3 rounded-full ${progress >= 100 ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  <TrendingUp size={24} />
               </div>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
               <div 
                  className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                  style={{ width: `${progress}%` }}
               >
                  {progress >= 100 && <div className="w-full h-full bg-white/20 animate-pulse"></div>}
               </div>
            </div>
            <p className="text-xs text-center text-gray-400 mt-4">
               {progress >= 100 ? 'Parabéns! Meta batida! 🚀' : `Faltam ${formatCurrency(Math.max(0, goal - summary.revenue))} para atingir a meta.`}
            </p>
         </div>
      </div>
    </div>
  );
};

const FinancialView: React.FC<{ companyId: string }> = ({ companyId }) => {
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [osRevenue, setOsRevenue] = useState(0);
   const [showModal, setShowModal] = useState(false);
   
   const [newTrans, setNewTrans] = useState({
      description: '',
      amount: '',
      type: TransactionType.EXPENSE,
      category: 'Despesa Geral'
   });

   const load = async () => {
      const trans = await dbService.getTransactions(companyId);
      setTransactions(trans);

      const orders = await dbService.getServiceOrders(companyId);
      const revenue = orders
         .filter(o => o.status === OSStatus.COMPLETED)
         .reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0);
      setOsRevenue(revenue);
   };

   useEffect(() => { load(); }, [companyId]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await dbService.createTransaction({
         companyId,
         description: newTrans.description,
         amount: parseFloat(newTrans.amount),
         type: newTrans.type,
         category: newTrans.category,
         date: Date.now()
      });
      setShowModal(false);
      setNewTrans({ description: '', amount: '', type: TransactionType.EXPENSE, category: 'Despesa Geral' });
      load();
   };

   const handleDelete = async (id: string) => {
      if(window.confirm("Apagar este registro?")) {
         await dbService.deleteTransaction(id);
         load();
      }
   };

   const manualIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
   
   const manualExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

   const totalIncome = osRevenue + manualIncome;
   const balance = totalIncome - manualExpense;

   return (
      <div className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-green-100 rounded-full text-green-600"><TrendingUp size={24} /></div>
                  <h4 className="text-gray-500 font-medium">Receita Total</h4>
               </div>
               <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalIncome)}</p>
               <p className="text-xs text-gray-400 mt-1">OS: {formatCurrency(osRevenue)} | Extras: {formatCurrency(manualIncome)}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-red-100 rounded-full text-red-600"><TrendingDown size={24} /></div>
                  <h4 className="text-gray-500 font-medium">Despesas</h4>
               </div>
               <p className="text-3xl font-bold text-gray-800">{formatCurrency(manualExpense)}</p>
               <p className="text-xs text-gray-400 mt-1">Contas a pagar e custos fixos</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <div className="flex items-center gap-4 mb-2">
                  <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                     <DollarSign size={24} />
                  </div>
                  <h4 className="text-gray-500 font-medium">Saldo / Lucro</h4>
               </div>
               <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(balance)}</p>
               <p className="text-xs text-gray-400 mt-1">Fluxo de Caixa Real</p>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="font-bold text-lg text-gray-800">Lançamentos Manuais</h3>
               <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Plus size={18} /> Novo Lançamento
               </button>
            </div>
            
            <div className="overflow-x-auto">
               <table className="min-w-full">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {transactions.map(t => (
                        <tr key={t.id}>
                           <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                           <td className="px-6 py-4 font-medium text-gray-800">{t.description}</td>
                           <td className="px-6 py-4 text-sm text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs">{t.category}</span>
                           </td>
                           <td className={`px-6 py-4 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                           </td>
                        </tr>
                     ))}
                     {transactions.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum lançamento manual registrado.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4">Novo Lançamento</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                        <div className="flex gap-2">
                           <button 
                              type="button" 
                              onClick={() => setNewTrans({...newTrans, type: TransactionType.EXPENSE})} 
                              className={`flex-1 py-2 rounded font-bold border ${newTrans.type === TransactionType.EXPENSE ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white text-gray-400 border-gray-200'}`}
                           >
                              Despesa (Saída)
                           </button>
                           <button 
                              type="button" 
                              onClick={() => setNewTrans({...newTrans, type: TransactionType.INCOME})} 
                              className={`flex-1 py-2 rounded font-bold border ${newTrans.type === TransactionType.INCOME ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white text-gray-400 border-gray-200'}`}
                           >
                              Receita (Entrada)
                           </button>
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                        <input className="w-full border p-2 rounded" placeholder="Ex: Aluguel, Venda de Sucata..." required value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$)</label>
                           <input type="number" step="0.01" className="w-full border p-2 rounded" placeholder="0.00" required value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                           <select className="w-full border p-2 rounded" value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})}>
                              <option>Despesa Geral</option>
                              <option>Aluguel</option>
                              <option>Energia/Água</option>
                              <option>Compra de Peças</option>
                              <option>Funcionários</option>
                              <option>Venda Avulsa</option>
                              <option>Outros</option>
                           </select>
                        </div>
                     </div>

                     <div className="flex gap-2 justify-end mt-6">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

const AgendaView: React.FC<{ companyId: string, onNavigate: (page: string) => void }> = ({ companyId, onNavigate }) => {
   const [appointments, setAppointments] = useState<Appointment[]>([]);
   const [showModal, setShowModal] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [customers, setCustomers] = useState<Customer[]>([]);
   
   const [newAppt, setNewAppt] = useState({
      customerId: '',
      dateStr: '', 
      timeStr: '', 
      description: ''
   });

   const load = async () => {
      const data = await dbService.getAppointments(companyId);
      setAppointments(data);
      const custs = await dbService.getCustomers(companyId);
      setCustomers(custs);
   };

   useEffect(() => { load(); }, [companyId]);

   const handleEdit = (appt: Appointment) => {
      setEditingId(appt.id);
      const d = new Date(appt.date);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      setNewAppt({
          customerId: appt.customerId,
          dateStr,
          timeStr,
          description: appt.description
      });
      setShowModal(true);
   };

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const cust = customers.find(c => c.id === newAppt.customerId);
      if(!cust) return;

      const fullDate = new Date(`${newAppt.dateStr}T${newAppt.timeStr}`);
      
      if (editingId) {
         await dbService.updateAppointment(editingId, {
            customerId: cust.id,
            customerName: cust.name,
            vehicle: `${cust.vehicleModel} (${cust.vehiclePlate})`,
            date: fullDate.getTime(),
            description: newAppt.description
         });
      } else {
         await dbService.createAppointment({
            companyId,
            customerId: cust.id,
            customerName: cust.name,
            vehicle: `${cust.vehicleModel} (${cust.vehiclePlate})`,
            date: fullDate.getTime(),
            description: newAppt.description,
            status: AppointmentStatus.SCHEDULED
         });
      }

      setShowModal(false);
      setNewAppt({ customerId: '', dateStr: '', timeStr: '', description: '' });
      setEditingId(null);
      load();
   };

   const handleDelete = async (id: string) => {
      if(window.confirm('Cancelar este agendamento?')) {
         await dbService.deleteAppointment(id);
         load();
      }
   };

   const handleConvertToOS = async (appt: Appointment) => {
      if(window.confirm('Converter este agendamento em Ordem de Serviço Pendente?')) {
         await dbService.createServiceOrder({
            companyId,
            customerId: appt.customerId,
            customerName: appt.customerName,
            vehicle: appt.vehicle,
            description: appt.description,
            status: OSStatus.PENDING,
            laborValue: 0,
            items: [],
            totalValue: 0
         });
         
         await dbService.updateAppointmentStatus(appt.id, AppointmentStatus.COMPLETED);
         onNavigate('os');
      }
   };

   const today = new Date();
   const days = [];
   for(let i=0; i<6; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push(d);
   }

   const getAppointmentsForDay = (date: Date) => {
      return appointments.filter(a => {
         const apptDate = new Date(a.date);
         return apptDate.getDate() === date.getDate() && 
                apptDate.getMonth() === date.getMonth() &&
                apptDate.getFullYear() === date.getFullYear() &&
                a.status !== AppointmentStatus.COMPLETED && 
                a.status !== AppointmentStatus.CANCELED; 
      }).sort((a, b) => a.date - b.date);
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Agenda da Semana</h3>
            <button onClick={() => { setEditingId(null); setNewAppt({ customerId: '', dateStr: '', timeStr: '', description: '' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
               <Plus size={18} /> Novo Agendamento
            </button>
         </div>

         <div className="flex gap-4 overflow-x-auto pb-6">
            {days.map((day, idx) => {
               const dayAppointments = getAppointmentsForDay(day);
               const isToday = day.getDate() === new Date().getDate();
               const weekDayName = day.toLocaleDateString('pt-BR', { weekday: 'short' });
               const dateStr = day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

               return (
                  <div key={idx} className={`min-w-[280px] w-full max-w-xs flex flex-col rounded-xl border h-full min-h-[400px] ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                     <div className={`p-3 font-bold border-b text-center ${isToday ? 'text-blue-800 border-blue-200' : 'text-gray-600 border-gray-100'}`}>
                        <div className="uppercase text-xs opacity-70">{weekDayName}</div>
                        <div className="text-lg">{dateStr}</div>
                     </div>
                     
                     <div className="p-2 space-y-3 flex-1">
                        {dayAppointments.length === 0 && (
                           <div className="text-center py-10 text-gray-300 text-sm">Livre</div>
                        )}
                        {dayAppointments.map(app => (
                           <div key={app.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
                              <div className="flex justify-between items-start mb-1">
                                 <span className="font-bold text-blue-600 bg-blue-50 px-2 rounded text-sm">
                                    {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                                 <div className="flex gap-1">
                                    <button onClick={() => handleEdit(app)} className="text-gray-300 hover:text-blue-500"><Pencil size={14}/></button>
                                    <button onClick={() => handleDelete(app.id)} className="text-gray-300 hover:text-red-400"><XCircle size={14}/></button>
                                 </div>
                              </div>
                              <h4 className="font-bold text-gray-800 text-sm mt-2">{app.vehicle}</h4>
                              <p className="text-xs text-gray-500 mb-2 truncate">{app.customerName}</p>
                              <p className="text-xs bg-gray-50 p-1 rounded mb-3">{app.description}</p>
                              
                              <button 
                                 onClick={() => handleConvertToOS(app)}
                                 className="w-full py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded font-bold flex items-center justify-center gap-1"
                              >
                                 Abrir OS <ArrowRight size={12}/>
                              </button>
                           </div>
                        ))}
                     </div>
                  </div>
               )
            })}
         </div>

         {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cliente / Veículo</label>
                        <select 
                           className="w-full border p-2 rounded" 
                           required 
                           value={newAppt.customerId} 
                           onChange={e => setNewAppt({...newAppt, customerId: e.target.value})}
                        >
                           <option value="">Selecione um cliente...</option>
                           {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.vehicleModel} ({c.vehiclePlate})</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
                           <input type="date" className="w-full border p-2 rounded" required value={newAppt.dateStr} onChange={e => setNewAppt({...newAppt, dateStr: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                           <input type="time" className="w-full border p-2 rounded" required value={newAppt.timeStr} onChange={e => setNewAppt({...newAppt, timeStr: e.target.value})} />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Descrição do Serviço</label>
                        <input className="w-full border p-2 rounded" placeholder="Ex: Troca de óleo..." required value={newAppt.description} onChange={e => setNewAppt({...newAppt, description: e.target.value})} />
                     </div>

                     <div className="flex gap-2 justify-end mt-6">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

const TeamView: React.FC<{ companyId: string }> = ({ companyId }) => {
   const [members, setMembers] = useState<TeamMember[]>([]);
   const [showModal, setShowModal] = useState(false);
   const [newMember, setNewMember] = useState({ name: '', role: 'Mecânico', commissionRate: 30 });
   
   const [reportData, setReportData] = useState<Record<string, number>>({});

   const load = async () => {
      const data = await dbService.getTeamMembers(companyId);
      setMembers(data);

      const osList = await dbService.getServiceOrders(companyId);
      const production: Record<string, number> = {};
      
      osList.forEach(os => {
         if (os.status === OSStatus.COMPLETED && os.mechanicId) {
             const commission = (os.laborValue || 0); 
             production[os.mechanicId] = (production[os.mechanicId] || 0) + commission;
         }
      });
      setReportData(production);
   };

   useEffect(() => { load(); }, [companyId]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await dbService.saveTeamMember({
         companyId,
         name: newMember.name,
         role: newMember.role,
         commissionRate: Number(newMember.commissionRate),
         active: true
      });
      setShowModal(false);
      setNewMember({ name: '', role: 'Mecânico', commissionRate: 30 });
      load();
   };

   const handleDelete = async (id: string) => {
      if(window.confirm('Remover este funcionário?')) {
         await dbService.deleteTeamMember(id);
         load();
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Equipe e Comissões</h3>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
               <Plus size={18} /> Novo Funcionário
            </button>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
               <table className="min-w-full">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comissão (%)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produção (Mão de Obra)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase">Comissão a Pagar</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {members.map(m => {
                        const laborTotal = reportData[m.id] || 0;
                        const commissionValue = laborTotal * (m.commissionRate / 100);
                        
                        return (
                           <tr key={m.id}>
                              <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    {m.name.charAt(0)}
                                 </div>
                                 {m.name}
                              </td>
                              <td className="px-6 py-4 text-gray-500">{m.role}</td>
                              <td className="px-6 py-4 font-mono text-sm">{m.commissionRate}%</td>
                              <td className="px-6 py-4 text-gray-500">{formatCurrency(laborTotal)}</td>
                              <td className="px-6 py-4 font-bold text-green-600">{formatCurrency(commissionValue)}</td>
                              <td className="px-6 py-4 text-center">
                                 <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                              </td>
                           </tr>
                        );
                     })}
                     {members.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum funcionário cadastrado.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
         
         <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
            <p className="flex items-center gap-2 font-bold mb-1"><UserCheck size={16}/> Como funciona?</p>
            <p>A comissão é calculada automaticamente com base no valor da <strong>Mão de Obra</strong> das Ordens de Serviço concluídas onde o funcionário foi marcado como responsável.</p>
         </div>

         {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4">Novo Funcionário</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo</label>
                        <input className="w-full border p-2 rounded" required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cargo</label>
                        <input className="w-full border p-2 rounded" required value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Taxa de Comissão (%)</label>
                        <input type="number" max="100" min="0" className="w-full border p-2 rounded" required value={newMember.commissionRate} onChange={e => setNewMember({...newMember, commissionRate: parseInt(e.target.value)})} />
                        <p className="text-xs text-gray-400 mt-1">Porcentagem sobre a mão de obra.</p>
                     </div>
                     <div className="flex gap-2 justify-end mt-6">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

const SettingsView: React.FC<{ companyId: string }> = ({ companyId }) => {
   const { company, updateCompany } = useAuth();
   const [formData, setFormData] = useState({
      phone: company?.phone || '',
      address: company?.address || '',
      warrantyTerms: company?.warrantyTerms || 'Garantia de 90 dias sobre as peças e mão de obra aqui executadas.',
      monthlyGoal: company?.monthlyGoal || 10000
   });
   const [loading, setLoading] = useState(false);

   const [importMode, setImportMode] = useState<'customers' | 'products' | null>(null);
   const [csvData, setCsvData] = useState<any[]>([]);
   const [headers, setHeaders] = useState<string[]>([]);
   const [mapping, setMapping] = useState<Record<string, string>>({});
   const [isImporting, setIsImporting] = useState(false);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
         const updated = await dbService.updateCompany(companyId, formData);
         updateCompany(updated);
         alert('Configurações salvas com sucesso!');
      } catch (err) {
         alert('Erro ao salvar');
      } finally {
         setLoading(false);
      }
   };

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         const text = event.target?.result as string;
         const result = parseCSV(text);
         if (result) {
             setHeaders(result.headers);
             setCsvData(result.data);
             const newMapping: Record<string, string> = {};
             const lowerHeaders = result.headers.map(h => h.toLowerCase());
             
             if (importMode === 'customers') {
                 const nameIdx = lowerHeaders.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('cliente'));
                 if (nameIdx >= 0) newMapping['name'] = result.headers[nameIdx];
                 
                 const phoneIdx = lowerHeaders.findIndex(h => h.includes('tel') || h.includes('cel') || h.includes('fone') || h.includes('whatsapp') || h.includes('phone'));
                 if (phoneIdx >= 0) newMapping['phone'] = result.headers[phoneIdx];

                 const modelIdx = lowerHeaders.findIndex(h => h.includes('modelo') || h.includes('veículo') || h.includes('carro'));
                 if (modelIdx >= 0) newMapping['vehicleModel'] = result.headers[modelIdx];

                 const plateIdx = lowerHeaders.findIndex(h => h.includes('placa') || h.includes('plate'));
                 if (plateIdx >= 0) newMapping['vehiclePlate'] = result.headers[plateIdx];
             } else if (importMode === 'products') {
                 const nameIdx = lowerHeaders.findIndex(h => h.includes('nome') || h.includes('desc') || h.includes('produto') || h.includes('peça'));
                 if (nameIdx >= 0) newMapping['name'] = result.headers[nameIdx];
                 
                 const costIdx = lowerHeaders.findIndex(h => h.includes('custo') || h.includes('compra') || h.includes('cost'));
                 if (costIdx >= 0) newMapping['costPrice'] = result.headers[costIdx];

                 const sellIdx = lowerHeaders.findIndex(h => h.includes('venda') || h.includes('preço') || h.includes('valor') || h.includes('price'));
                 if (sellIdx >= 0) newMapping['sellPrice'] = result.headers[sellIdx];
                 
                 const qtdIdx = lowerHeaders.findIndex(h => h.includes('qtd') || h.includes('quant') || h.includes('estoque'));
                 if (qtdIdx >= 0) newMapping['quantity'] = result.headers[qtdIdx];
             }
             setMapping(newMapping);
         }
      };
      reader.readAsText(file);
   };

   const executeImport = async () => {
      if (!importMode) return;
      setIsImporting(true);
      
      let count = 0;
      for (const row of csvData) {
          const getVal = (field: string) => {
              const headerName = mapping[field];
              const idx = headers.indexOf(headerName);
              if (idx === -1) return '';
              return row[idx] || '';
          };

          if (importMode === 'customers') {
              const name = getVal('name');
              const phone = getVal('phone');
              if (name) {
                  await dbService.createCustomer({
                      companyId,
                      name,
                      phone,
                      vehicleModel: getVal('vehicleModel') || 'Não informado',
                      vehiclePlate: getVal('vehiclePlate') || ''
                  });
                  count++;
              }
          } else if (importMode === 'products') {
              const name = getVal('name');
              if (name) {
                  const cleanMoney = (str: string) => {
                      if (!str) return 0;
                      return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
                  };
                  
                  await dbService.createProduct({
                      companyId,
                      name,
                      costPrice: cleanMoney(getVal('costPrice')),
                      sellPrice: cleanMoney(getVal('sellPrice')),
                      quantity: parseInt(getVal('quantity')) || 0
                  });
                  count++;
              }
          }
      }

      setIsImporting(false);
      setImportMode(null);
      setCsvData([]);
      alert(`${count} registros importados com sucesso!`);
   };

   return (
      <div className="max-w-3xl mx-auto space-y-8">
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <Building2 size={20} className="text-blue-600" /> Dados da Oficina
            </h3>
            
            <form onSubmit={handleSave} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                     <input disabled value={company?.name} className="w-full border bg-gray-50 p-2 rounded text-gray-500" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                     <input disabled value={company?.document} className="w-full border bg-gray-50 p-2 rounded text-gray-500" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                     <input 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="(00) 00000-0000"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Meta Mensal de Faturamento (R$)</label>
                     <input 
                        type="number"
                        value={formData.monthlyGoal} 
                        onChange={e => setFormData({...formData, monthlyGoal: parseFloat(e.target.value)})} 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                     />
                  </div>
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                  <input 
                     value={formData.address} 
                     onChange={e => setFormData({...formData, address: e.target.value})} 
                     className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
                  />
                  <p className="text-xs text-gray-400 mt-1">Aparecerá no cabeçalho da OS impressa.</p>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Termos de Garantia (Rodapé da OS)</label>
                  <textarea 
                     value={formData.warrantyTerms} 
                     onChange={e => setFormData({...formData, warrantyTerms: e.target.value})} 
                     className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none h-24" 
                     placeholder="Texto padrão de garantia..."
                  />
               </div>

               <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button 
                     type="submit" 
                     disabled={loading}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                     <Save size={18} />
                     {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
               </div>
            </form>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
               <FileSpreadsheet size={20} className="text-green-600" /> Importação de Dados (CSV)
            </h3>
            
            {!importMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={() => setImportMode('customers')}
                        className="border border-gray-200 rounded-lg p-6 hover:bg-blue-50 hover:border-blue-200 transition-colors flex flex-col items-center text-center"
                    >
                        <div className="bg-blue-100 p-3 rounded-full mb-3 text-blue-600"><User size={24}/></div>
                        <h4 className="font-bold text-gray-800">Importar Clientes</h4>
                        <p className="text-xs text-gray-500 mt-1">Planilhas com Nome, Telefone, Placa...</p>
                    </button>
                    <button 
                        onClick={() => setImportMode('products')}
                        className="border border-gray-200 rounded-lg p-6 hover:bg-orange-50 hover:border-orange-200 transition-colors flex flex-col items-center text-center"
                    >
                        <div className="bg-orange-100 p-3 rounded-full mb-3 text-orange-600"><Package size={24}/></div>
                        <h4 className="font-bold text-gray-800">Importar Estoque</h4>
                        <p className="text-xs text-gray-500 mt-1">Planilhas com Nome, Custo, Preço, Qtd...</p>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-700">
                           Importando: {importMode === 'customers' ? 'Clientes' : 'Produtos'}
                        </h4>
                        <button onClick={() => { setImportMode(null); setCsvData([]); }} className="text-sm text-red-500 hover:underline">Cancelar</button>
                    </div>

                    {!csvData.length ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                            <Upload className="mx-auto text-gray-400 mb-2" size={32}/>
                            <p className="text-sm text-gray-600 mb-4">Clique para selecionar seu arquivo .CSV</p>
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            <p className="text-xs text-gray-400 mt-4">
                               Dica: O sistema tentará reconhecer colunas como "Nome", "Telefone", "Preço", etc. automaticamente.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                                <CheckCircle size={16} className="shrink-0 mt-0.5"/>
                                <div>
                                    <p className="font-bold">Arquivo carregado! {csvData.length} registros encontrados.</p>
                                    <p>Confira abaixo se as colunas foram identificadas corretamente:</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {importMode === 'customers' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coluna Nome (Obrigatório)</label>
                                            <select className="w-full border p-2 rounded" value={mapping['name']} onChange={e => setMapping({...mapping, name: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coluna Telefone</label>
                                            <select className="w-full border p-2 rounded" value={mapping['phone']} onChange={e => setMapping({...mapping, phone: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coluna Modelo Veículo</label>
                                            <select className="w-full border p-2 rounded" value={mapping['vehicleModel']} onChange={e => setMapping({...mapping, vehicleModel: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coluna Placa</label>
                                            <select className="w-full border p-2 rounded" value={mapping['vehiclePlate']} onChange={e => setMapping({...mapping, vehiclePlate: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {importMode === 'products' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Peça (Obrigatório)</label>
                                            <select className="w-full border p-2 rounded" value={mapping['name']} onChange={e => setMapping({...mapping, name: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço de Custo (Obrigatório)</label>
                                            <select className="w-full border p-2 rounded" value={mapping['costPrice']} onChange={e => setMapping({...mapping, costPrice: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço de Venda (Obrigatório)</label>
                                            <select className="w-full border p-2 rounded" value={mapping['sellPrice']} onChange={e => setMapping({...mapping, sellPrice: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantidade em Estoque (Obrigatório)</label>
                                            <select className="w-full border p-2 rounded" value={mapping['quantity']} onChange={e => setMapping({...mapping, quantity: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={executeImport}
                                    disabled={
                                       isImporting ||
                                       (importMode === 'customers' && !mapping['name']) ||
                                       (importMode === 'products' && (!mapping['name'] || !mapping['costPrice'] || !mapping['sellPrice'] || !mapping['quantity']))
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isImporting ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                                    {isImporting ? 'Importando...' : 'Confirmar Importação'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
         </div>
      </div>
   );
};

const InventoryView: React.FC<{ companyId: string }> = ({ companyId }) => {
   const [products, setProducts] = useState<Product[]>([]);
   const [searchTerm, setSearchTerm] = useState(''); // NEW SEARCH
   const [showModal, setShowModal] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [newProd, setNewProd] = useState({ name: '', costPrice: '', sellPrice: '', quantity: '' });

   const load = () => dbService.getProducts(companyId).then(setProducts);
   useEffect(() => { load(); }, [companyId]);

   const handleEdit = (prod: Product) => {
      setEditingId(prod.id);
      setNewProd({
         name: prod.name,
         costPrice: String(prod.costPrice),
         sellPrice: String(prod.sellPrice),
         quantity: String(prod.quantity)
      });
      setShowModal(true);
   };

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const prodData = {
         name: newProd.name,
         costPrice: parseFloat(newProd.costPrice) || 0,
         sellPrice: parseFloat(newProd.sellPrice) || 0,
         quantity: parseInt(newProd.quantity) || 0
      };

      if (editingId) {
         await dbService.updateProduct(editingId, prodData);
      } else {
         await dbService.createProduct({
            companyId,
            ...prodData
         });
      }
      
      setShowModal(false);
      setNewProd({ name: '', costPrice: '', sellPrice: '', quantity: '' });
      setEditingId(null);
      load();
   };

   const handleDelete = async (id: string) => {
      if(window.confirm('Tem certeza que deseja remover este produto?')) {
         await dbService.deleteProduct(id);
         load();
      }
   }

   const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
   );

   return (
      <div className="space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-bold text-gray-800">Controle de Estoque</h3>
            <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                     type="text" 
                     placeholder="Buscar peça..." 
                     className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
               <button onClick={() => { setEditingId(null); setNewProd({ name: '', costPrice: '', sellPrice: '', quantity: '' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shrink-0">
                  <Plus size={18} /> <span className="hidden sm:inline">Nova Peça</span>
               </button>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome da Peça</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venda</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     {filteredProducts.map(p => (
                        <tr key={p.id}>
                           <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.quantity < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                 {p.quantity} un
                              </span>
                           </td>
                           <td className="px-6 py-4 text-gray-500">{formatCurrency(p.costPrice)}</td>
                           <td className="px-6 py-4 text-gray-900 font-semibold">{formatCurrency(p.sellPrice)}</td>
                           <td className="px-6 py-4 flex items-center gap-2">
                              <button onClick={() => handleEdit(p)} className="text-blue-400 hover:text-blue-600">
                                 <Pencil size={18} />
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600">
                                 <Trash2 size={18} />
                              </button>
                           </td>
                        </tr>
                     ))}
                     {filteredProducts.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma peça encontrada.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {showModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
               <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Peça' : 'Cadastrar Peça'}</h3>
               <form onSubmit={handleSave} className="space-y-4">
                  <div>
                     <label className="block text-xs font-medium text-gray-500 mb-1">Nome da Peça</label>
                     <input className="w-full border p-2 rounded" placeholder="Ex: Filtro de Óleo" required value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Preço Custo (R$)</label>
                        <input type="number" step="0.01" className="w-full border p-2 rounded" placeholder="0.00" required value={newProd.costPrice} onChange={e => setNewProd({...newProd, costPrice: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Preço Venda (R$)</label>
                        <input type="number" step="0.01" className="w-full border p-2 rounded" placeholder="0.00" required value={newProd.sellPrice} onChange={e => setNewProd({...newProd, sellPrice: e.target.value})} />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade Inicial</label>
                     <input type="number" className="w-full border p-2 rounded" placeholder="0" required value={newProd.quantity} onChange={e => setNewProd({...newProd, quantity: e.target.value})} />
                  </div>
                  <div className="flex gap-2 justify-end mt-6">
                     <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                     <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                  </div>
               </form>
            </div>
         </div>
         )}
      </div>
   );
};

const CustomersView: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // NEW SEARCH
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCust, setNewCust] = useState({ name: '', phone: '', vehicleModel: '', vehiclePlate: '' });

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<ServiceOrder[]>([]);

  const load = () => dbService.getCustomers(companyId).then(setCustomers);
  useEffect(() => { load(); }, [companyId]);

  const handleEdit = (cust: Customer) => {
      setEditingId(cust.id);
      setNewCust({
          name: cust.name,
          phone: cust.phone,
          vehicleModel: cust.vehicleModel,
          vehiclePlate: cust.vehiclePlate
      });
      setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await dbService.updateCustomer(editingId, newCust);
    } else {
        await dbService.createCustomer({ ...newCust, companyId });
    }
    setShowModal(false);
    setNewCust({ name: '', phone: '', vehicleModel: '', vehiclePlate: '' });
    setEditingId(null);
    load();
  };

  const handleOpenHistory = async (customer: Customer) => {
     setSelectedHistoryCustomer(customer);
     setHistoryModalOpen(true);
     const allOrders = await dbService.getServiceOrders(companyId);
     const usersOrders = allOrders
         .filter(o => o.customerId === customer.id)
         .sort((a, b) => b.createdAt - a.createdAt);
     setCustomerOrders(usersOrders);
  };

  const filteredCustomers = customers.filter(c => 
     c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h3 className="text-lg font-bold text-gray-800">Clientes e Veículos</h3>
         <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
               <input 
                  type="text" 
                  placeholder="Nome, placa ou telefone..." 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <button onClick={() => { setEditingId(null); setNewCust({ name: '', phone: '', vehicleModel: '', vehiclePlate: '' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shrink-0">
               <Plus size={18} /> <span className="hidden sm:inline">Novo Cliente</span>
            </button>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                 <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                 {filteredCustomers.map(c => (
                    <tr key={c.id}>
                       <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                       <td className="px-6 py-4 text-gray-500">{c.phone}</td>
                       <td className="px-6 py-4">{c.vehicleModel}</td>
                       <td className="px-6 py-4 font-mono text-sm bg-gray-50 w-min rounded px-2">{c.vehiclePlate}</td>
                       <td className="px-6 py-4 flex gap-2">
                          <button 
                           onClick={() => handleEdit(c)}
                           className="text-blue-400 hover:text-blue-600 bg-blue-50 p-2 rounded-full transition-colors" title="Editar Cliente">
                             <Pencil size={18} />
                          </button>
                          <button 
                           onClick={() => openWhatsApp(c.phone, `Olá ${c.name}, somos da oficina. Tudo bem?`)}
                           className="text-green-500 hover:text-green-600 bg-green-50 p-2 rounded-full transition-colors" title="Chamar no WhatsApp">
                             <MessageCircle size={18} />
                          </button>
                          <button 
                           onClick={() => handleOpenHistory(c)}
                           className="text-blue-500 hover:text-blue-600 bg-blue-50 p-2 rounded-full transition-colors" title="Histórico de Manutenção">
                             <History size={18} />
                          </button>
                       </td>
                    </tr>
                 ))}
                 {filteredCustomers.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                 <input className="w-full border p-2 rounded" placeholder="Nome Completo" required value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
                 <input className="w-full border p-2 rounded" placeholder="Telefone (WhatsApp) ex: 11999998888" required value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
                 <input className="w-full border p-2 rounded" placeholder="Modelo do Veículo" required value={newCust.vehicleModel} onChange={e => setNewCust({...newCust, vehicleModel: e.target.value})} />
                 <input className="w-full border p-2 rounded uppercase" placeholder="Placa" required value={newCust.vehiclePlate} onChange={e => setNewCust({...newCust, vehiclePlate: e.target.value})} />
                 <div className="flex gap-2 justify-end mt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {historyModalOpen && selectedHistoryCustomer && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl my-10 max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50 rounded-t-xl">
                  <div>
                     <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <History className="text-blue-600"/> Histórico de Manutenção
                     </h3>
                     <p className="text-sm text-gray-500 mt-1">
                        {selectedHistoryCustomer.name} • {selectedHistoryCustomer.vehicleModel} ({selectedHistoryCustomer.vehiclePlate})
                     </p>
                  </div>
                  <button onClick={() => setHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                     <XCircle size={24} />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto bg-gray-50/50">
                  {customerOrders.length === 0 ? (
                     <div className="text-center py-10 text-gray-400">
                        <Car size={48} className="mx-auto mb-2 opacity-20" />
                        <p>Nenhum serviço registrado para este veículo.</p>
                     </div>
                  ) : (
                     <div className="relative border-l-2 border-blue-200 ml-4 space-y-8">
                        {customerOrders.map(order => (
                           <div key={order.id} className="relative pl-8">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm"></div>
                              
                              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                 <div className="flex justify-between items-start mb-2">
                                    <div>
                                       <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                                          {new Date(order.createdAt).toLocaleDateString()}
                                       </span>
                                       <h4 className="font-bold text-gray-800 mt-1">
                                          {order.description}
                                       </h4>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                       order.status === OSStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                       'bg-gray-100 text-gray-500'
                                    }`}>
                                       {order.status}
                                    </span>
                                 </div>

                                 {order.items && order.items.length > 0 && (
                                    <div className="mt-3 bg-slate-50 rounded p-3 text-sm">
                                       <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                                          <Package size={12} className="mr-1"/> Peças Utilizadas
                                       </p>
                                       <ul className="space-y-1">
                                          {order.items.map((item, idx) => (
                                             <li key={idx} className="flex justify-between text-gray-700">
                                                <span>{item.quantity}x {item.name}</span>
                                                <span className="text-gray-400 text-xs">{formatCurrency(item.total)}</span>
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 )}

                                 <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">OS #{order.id.split('-')[1]}</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(order.totalValue)}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
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

  const [showChecklist, setShowChecklist] = useState(false);
  const [checklist, setChecklist] = useState<Checklist | null>(null);

  const loadData = async () => {
     const [o, c, p, m] = await Promise.all([
        dbService.getServiceOrders(companyId),
        dbService.getCustomers(companyId),
        dbService.getProducts(companyId),
        dbService.getTeamMembers(companyId)
     ]);
     setOrders(o.sort((a,b) => b.createdAt - a.createdAt));
     setCustomers(c);
     setProducts(p);
     setMechanics(m);
  };

  useEffect(() => { loadData(); }, [companyId]);

  const handleCreate = () => {
     setEditingId(null);
     setFormData({
        status: OSStatus.PENDING,
        items: [],
        laborValue: 0,
        totalValue: 0,
        description: ''
     });
     setChecklist(null);
     setView('form');
  };

  const handleEdit = async (os: ServiceOrder) => {
     setEditingId(os.id);
     setFormData({ ...os });
     const chk = await dbService.getChecklist(os.id);
     setChecklist(chk);
     setView('form');
  };

  const handleSave = async () => {
     if (!formData.customerId || !formData.description) {
        alert("Cliente e Descrição são obrigatórios.");
        return;
     }

     const cust = customers.find(c => c.id === formData.customerId);
     const mech = mechanics.find(m => m.id === formData.mechanicId);

     const data = {
        companyId,
        customerId: formData.customerId,
        customerName: cust?.name || 'Cliente',
        vehicle: formData.vehicle || (cust ? `${cust.vehicleModel} (${cust.vehiclePlate})` : ''),
        description: formData.description,
        status: formData.status || OSStatus.PENDING,
        mechanicId: formData.mechanicId,
        mechanicName: mech?.name,
        laborValue: Number(formData.laborValue) || 0,
        items: formData.items || [],
        totalValue: (Number(formData.laborValue) || 0) + (formData.items?.reduce((acc, i) => acc + i.total, 0) || 0)
     };

     if (editingId) {
        await dbService.updateServiceOrder(editingId, data);
     } else {
        const newOS = await dbService.createServiceOrder(data);
        setEditingId(newOS.id);
        setFormData({ ...data, id: newOS.id });
     }
     
     if(view === 'form') {
         setView('list');
         loadData();
     }
  };

  const handleAddItem = () => {
     const p = products.find(x => x.id === selProd);
     if (p) {
        const newItem: OSItem = {
           productId: p.id,
           name: p.name,
           quantity: selQty,
           unitPrice: p.sellPrice,
           total: p.sellPrice * selQty
        };
        const newItems = [...(formData.items || []), newItem];
        setFormData({ ...formData, items: newItems });
        setSelProd('');
        setSelQty(1);
     }
  };

  const handleRemoveItem = (idx: number) => {
     const newItems = [...(formData.items || [])];
     newItems.splice(idx, 1);
     setFormData({ ...formData, items: newItems });
  };

  const handlePrint = (os: ServiceOrder) => {
     const cust = customers.find(c => c.id === os.customerId);
     if(view === 'form' && checklist) {
         printOrder(os, cust, company, checklist);
     } else {
         dbService.getChecklist(os.id).then(chk => {
            printOrder(os, cust, company, chk);
         });
     }
  };

  const handleOpenChecklist = () => {
     if(!checklist) {
        setChecklist({
           id: '', osId: editingId || '', companyId, fuelLevel: 2, 
           items: [
              { name: 'Luzes', status: ChecklistStatus.OK },
              { name: 'Pneus', status: ChecklistStatus.OK },
              { name: 'Lataria', status: ChecklistStatus.OK },
              { name: 'Vidros', status: ChecklistStatus.OK },
           ],
           notes: '', updatedAt: Date.now()
        });
     }
     setShowChecklist(true);
  };
  
  const handleSaveChecklist = async () => {
     if(checklist && editingId) {
        const saved = await dbService.saveChecklist({ ...checklist, osId: editingId });
        setChecklist(saved);
        setShowChecklist(false);
     } else {
        alert("Salve a OS antes de editar o checklist.");
     }
  };

  const filteredOrders = orders.filter(o => 
     o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     o.id.includes(searchTerm) ||
     o.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === 'list') {
     return (
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-lg font-bold text-gray-800">Ordens de Serviço</h3>
              <div className="flex gap-2 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar OS..." />
                 </div>
                 <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shrink-0">
                    <Plus size={18} /> Nova OS
                 </button>
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                       <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº OS</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente / Veículo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                       {filteredOrders.map(os => (
                          <tr key={os.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 font-mono text-sm text-gray-500">#{os.id.split('-')[1]}</td>
                             <td className="px-6 py-4 text-sm text-gray-500">{new Date(os.createdAt).toLocaleDateString()}</td>
                             <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{os.customerName}</div>
                                <div className="text-xs text-gray-500">{os.vehicle}</div>
                             </td>
                             <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                   os.status === OSStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                                   os.status === OSStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                   os.status === OSStatus.CANCELED ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                   {os.status}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(os.totalValue)}</td>
                             <td className="px-6 py-4 flex justify-center gap-2">
                                <button onClick={() => handleEdit(os)} className="text-blue-500 hover:text-blue-700 p-2"><Pencil size={18}/></button>
                                <button onClick={() => handlePrint(os)} className="text-gray-500 hover:text-gray-700 p-2"><Printer size={18}/></button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
     );
  }

  const totalParts = formData.items?.reduce((acc, i) => acc + i.total, 0) || 0;
  const totalOS = (Number(formData.laborValue) || 0) + totalParts;

  return (
     <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
           <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft size={18} /> Voltar
           </button>
           <h3 className="text-xl font-bold text-gray-800">
              {editingId ? `Editando OS #${editingId.split('-')[1]}` : 'Nova Ordem de Serviço'}
           </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Dados Principais</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Cliente</label>
                       <select 
                          className="w-full border p-2 rounded" 
                          value={formData.customerId || ''} 
                          onChange={e => {
                             const c = customers.find(x => x.id === e.target.value);
                             setFormData({ 
                                ...formData, 
                                customerId: e.target.value,
                                vehicle: c ? `${c.vehicleModel} (${c.vehiclePlate})` : ''
                             });
                          }}
                       >
                          <option value="">Selecione...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Veículo</label>
                        <input className="w-full border p-2 rounded bg-gray-50" value={formData.vehicle || ''} onChange={e => setFormData({...formData, vehicle: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Descrição do Problema / Serviço</label>
                        <textarea className="w-full border p-2 rounded" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Mecânico Responsável</label>
                       <select className="w-full border p-2 rounded" value={formData.mechanicId || ''} onChange={e => setFormData({...formData, mechanicId: e.target.value})}>
                          <option value="">Selecione...</option>
                          {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                       <select className="w-full border p-2 rounded font-bold" value={formData.status || OSStatus.PENDING} onChange={e => setFormData({...formData, status: e.target.value as OSStatus})}>
                          <option value={OSStatus.PENDING}>Pendente / Orçamento</option>
                          <option value={OSStatus.IN_PROGRESS}>Em Execução</option>
                          <option value={OSStatus.WAITING_PARTS}>Aguardando Peças</option>
                          <option value={OSStatus.COMPLETED}>Finalizada</option>
                          <option value={OSStatus.CANCELED}>Cancelada</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h4 className="font-bold text-gray-700 mb-4 border-b pb-2 flex justify-between items-center">
                    Peças e Serviços
                 </h4>
                 
                 <div className="flex gap-2 mb-4 bg-gray-50 p-3 rounded-lg items-end">
                    <div className="flex-1">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Adicionar Peça</label>
                       <select className="w-full border p-2 rounded" value={selProd} onChange={e => setSelProd(e.target.value)}>
                          <option value="">Selecione...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.sellPrice)})</option>)}
                       </select>
                    </div>
                    <div className="w-20">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Qtd</label>
                       <input type="number" className="w-full border p-2 rounded" value={selQty} onChange={e => setSelQty(Number(e.target.value))} />
                    </div>
                    <button onClick={handleAddItem} className="bg-green-600 text-white p-2.5 rounded hover:bg-green-700">
                       <Plus size={18} />
                    </button>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                       <thead className="bg-gray-50 text-gray-500">
                          <tr>
                             <th className="px-4 py-2 text-left">Item</th>
                             <th className="px-4 py-2 text-center">Qtd</th>
                             <th className="px-4 py-2 text-right">Unit.</th>
                             <th className="px-4 py-2 text-right">Total</th>
                             <th className="px-4 py-2"></th>
                          </tr>
                       </thead>
                       <tbody>
                          {formData.items?.map((item, idx) => (
                             <tr key={idx} className="border-b last:border-0">
                                <td className="px-4 py-3 min-w-[150px]">{item.name}</td>
                                <td className="px-4 py-3 text-center">{item.quantity}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                                <td className="px-4 py-3 text-center">
                                   <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                             </tr>
                          ))}
                          {!formData.items?.length && <tr><td colSpan={5} className="text-center py-4 text-gray-400">Nenhuma peça adicionada.</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Valores</h4>
                 
                 <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-500">Total Peças</span>
                       <span className="font-medium">{formatCurrency(totalParts)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-500">Mão de Obra</span>
                       <div className="flex items-center gap-1 w-32">
                          <span className="text-gray-400 text-xs">R$</span>
                          <input 
                             type="number" 
                             className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none p-1 font-medium" 
                             value={formData.laborValue} 
                             onChange={e => setFormData({...formData, laborValue: Number(e.target.value)})}
                          />
                       </div>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-3">
                       <span>TOTAL</span>
                       <span className="text-blue-600">{formatCurrency(totalOS)}</span>
                    </div>
                 </div>

                 <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-500/30 mb-3 flex justify-center gap-2">
                    <Save size={20} /> Salvar OS
                 </button>
                 
                 {editingId && (
                    <button onClick={() => handlePrint(formData as ServiceOrder)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg flex justify-center gap-2">
                       <Printer size={20} /> Imprimir
                    </button>
                 )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Vistoria & Checklist</h4>
                 <div className="text-center">
                    {checklist ? (
                       <div className="mb-4 text-left bg-green-50 p-3 rounded border border-green-100">
                          <p className="text-sm text-green-800 font-bold flex items-center gap-2"><CheckCircle size={16}/> Checklist Realizado</p>
                          <p className="text-xs text-green-600 mt-1">Nível de Combustível: {['Vazio','1/4','1/2','3/4','Cheio'][checklist.fuelLevel]}</p>
                       </div>
                    ) : (
                       <p className="text-sm text-gray-400 mb-4">Nenhuma vistoria registrada.</p>
                    )}
                    <button 
                       onClick={handleOpenChecklist}
                       disabled={!editingId}
                       className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-500 hover:text-blue-500 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       {checklist ? 'Editar Vistoria' : 'Realizar Vistoria de Entrada'}
                    </button>
                    {!editingId && <p className="text-xs text-gray-400 mt-2">Salve a OS para liberar.</p>}
                 </div>
              </div>
           </div>
        </div>

        {showChecklist && checklist && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                 <h3 className="text-lg font-bold mb-4">Vistoria do Veículo</h3>
                 
                 <div className="space-y-6">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Combustível</label>
                       <div className="flex justify-between bg-gray-100 rounded-lg p-1">
                          {[0, 1, 2, 3, 4].map(level => (
                             <button 
                                key={level}
                                onClick={() => setChecklist({...checklist, fuelLevel: level})}
                                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${checklist.fuelLevel === level ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
                             >
                                {['E', '1/4', '1/2', '3/4', 'F'][level]}
                             </button>
                          ))}
                       </div>
                       <div className="flex justify-between px-1 mt-1">
                          <span className="text-xs text-red-400"><Fuel size={14}/></span>
                          <span className="text-xs text-green-400"><Fuel size={14}/></span>
                       </div>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Itens Inspecionados</label>
                       <div className="space-y-2">
                          {checklist.items.map((item, idx) => (
                             <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <span className="font-medium text-sm">{item.name}</span>
                                <div className="flex gap-1">
                                    <button 
                                       onClick={() => {
                                          const newItems = [...checklist.items];
                                          newItems[idx].status = ChecklistStatus.OK;
                                          setChecklist({...checklist, items: newItems});
                                       }}
                                       className={`p-1 px-2 rounded text-xs font-bold ${item.status === ChecklistStatus.OK ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                                    >OK</button>
                                    <button 
                                       onClick={() => {
                                          const newItems = [...checklist.items];
                                          newItems[idx].status = ChecklistStatus.DAMAGED;
                                          setChecklist({...checklist, items: newItems});
                                       }}
                                       className={`p-1 px-2 rounded text-xs font-bold ${item.status === ChecklistStatus.DAMAGED ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}
                                    >Avariado</button>
                                    <button 
                                       onClick={() => {
                                          const newItems = [...checklist.items];
                                          newItems[idx].status = ChecklistStatus.MISSING;
                                          setChecklist({...checklist, items: newItems});
                                       }}
                                       className={`p-1 px-2 rounded text-xs font-bold ${item.status === ChecklistStatus.MISSING ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}
                                    >Ausente</button>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Observações Adicionais</label>
                        <textarea 
                           className="w-full border p-2 rounded text-sm" 
                           rows={3} 
                           placeholder="Riscos, amassados pré-existentes..."
                           value={checklist.notes}
                           onChange={e => setChecklist({...checklist, notes: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <button onClick={() => setShowChecklist(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button onClick={handleSaveChecklist} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar Checklist</button>
                    </div>
                 </div>
              </div>
           </div>
        )}
     </div>
  );
};

export const ClientDashboard: React.FC<{ page: string, onNavigate: (page: string) => void }> = ({ page, onNavigate }) => {
  const { company, user } = useAuth();
  
  const isExpired = company ? company.expiresAt < Date.now() : false;

  if (isExpired && page !== 'dashboard' && page !== 'settings') {
    return (
       <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="bg-red-100 p-6 rounded-full mb-4">
             <Ban size={48} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Funcionalidade Bloqueada</h2>
          <p className="text-gray-600 max-w-md">
             Sua licença expirou. Entre em contato com o suporte para regularizar seu acesso e continuar gerenciando sua oficina.
          </p>
       </div>
    );
  }

  if (page === 'dashboard') return <HomeView companyId={company!.id} />;
  if (page === 'agenda') return <AgendaView companyId={company!.id} onNavigate={onNavigate} />;
  if (page === 'customers') return <CustomersView companyId={company!.id} />;
  if (page === 'os') return <OSView companyId={company!.id} />;
  if (page === 'team') return <TeamView companyId={company!.id} />; 
  if (page === 'inventory') return <InventoryView companyId={company!.id} />;
  if (page === 'financial') return <FinancialView companyId={company!.id} />; 
  if (page === 'reports') return <ReportsView companyId={company!.id} />;
  if (page === 'settings') return <SettingsView companyId={company!.id} />;

  return null;
};