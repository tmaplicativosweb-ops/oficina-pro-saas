import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { authService } from './mockDb';
import { ArrowLeft, Building2, User, Mail, Lock } from 'lucide-react';

interface RegisterProps {
  onBack: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    companyName: '',
    document: '',
    ownerName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, company } = await authService.registerCompany(
        formData.companyName,
        formData.document,
        formData.ownerName,
        formData.email,
        formData.password
      );
      login(user, company);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
       <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          
          <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between">
             <div>
                <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors text-sm mb-8">
                   <ArrowLeft size={16} className="mr-2" /> Voltar
                </button>
                <h2 className="text-2xl font-bold mb-4">Comece Grátis</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                   Crie sua conta agora e tenha acesso total por <strong className="text-blue-400">7 dias</strong>.
                   Sem compromisso.
                </p>
             </div>
             <div className="text-xs text-slate-500 mt-8">
                &copy; 2024 OficinaPro SaaS
             </div>
          </div>

          <div className="p-8 md:w-2/3">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Dados da Empresa</h3>
            
            {error && (
               <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-100">
                  {error}
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome da Oficina</label>
                  <div className="relative">
                     <Building2 className="absolute left-3 top-3 text-gray-400" size={18} />
                     <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: Auto Mecânica Silva"
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CNPJ / Documento</label>
                  <input 
                     type="text" 
                     required
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     placeholder="00.000.000/0001-00"
                     value={formData.document}
                     onChange={e => setFormData({...formData, document: e.target.value})}
                  />
               </div>

               <div className="pt-4 border-t border-gray-100 mt-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Dados de Acesso</h3>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Seu Nome</label>
                        <div className="relative">
                           <User className="absolute left-3 top-3 text-gray-400" size={18} />
                           <input 
                              type="text" 
                              required
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="João Silva"
                              value={formData.ownerName}
                              onChange={e => setFormData({...formData, ownerName: e.target.value})}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email de Login</label>
                        <div className="relative">
                           <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                           <input 
                              type="email" 
                              required
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="joao@oficina.com"
                              value={formData.email}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                           <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                           <input 
                              type="password" 
                              required
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="********"
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-green-500/30"
               >
                  {loading ? 'Criando conta...' : 'Ativar Demo Grátis'}
               </button>
            </form>
          </div>
       </div>
    </div>
  );
};