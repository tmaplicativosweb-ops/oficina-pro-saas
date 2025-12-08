import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { authService } from './mockDb';
import { Wrench, CheckCircle } from 'lucide-react';

interface LoginProps {
  onRegisterClick: () => void;
}

export const Login: React.FC<LoginProps> = ({ onRegisterClick }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, company } = await authService.login(email, password);
      login(user, company);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[80px]"></div>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="bg-blue-600 p-8 text-center">
           <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
              <Wrench className="text-white" size={32} />
           </div>
           <h1 className="text-3xl font-bold text-white mb-2">OficinaPro</h1>
           <p className="text-blue-100">Gestão inteligente para sua oficina</p>
        </div>

        <div className="p-8 pt-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center">
              <span className="font-semibold mr-2">Erro:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.01] shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Acessar Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
             <div className="text-center mb-4">
                <span className="text-gray-500 text-sm">Ainda não tem conta?</span>
             </div>
             <button
               onClick={onRegisterClick}
               className="w-full border-2 border-blue-100 hover:border-blue-500 hover:text-blue-600 text-gray-600 font-semibold py-3 rounded-lg transition-all"
             >
               Cadastrar minha Oficina (7 dias Grátis)
             </button>
             <div className="mt-4 flex justify-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><CheckCircle size={12}/> Multi-empresa</span>
                <span className="flex items-center gap-1"><CheckCircle size={12}/> Gestão de OS</span>
                <span className="flex items-center gap-1"><CheckCircle size={12}/> Segurança</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};