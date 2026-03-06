import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../services/logService';
import { motion } from 'motion/react';
import { supabase } from '../services/supabase';

export function LoginPage() {
  const [tituloClube, setTituloClube] = useState('');
  const [senhaCpf, setSenhaCpf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(tituloClube, senhaCpf);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Log activity
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('perfis').select('nome').eq('id', user?.id).single();
      if (user && profile) {
        logActivity(user.id, profile.nome, 'Login', `Usuário ${profile.nome} acessou o sistema.`);
      }
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center group cursor-pointer">
            <div className="relative pr-6">
              <span className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-2xl">
                ATP
              </span>
              <div className="absolute top-1/2 left-0 w-[calc(100%-1.5rem)] h-[2px] md:h-[4px] bg-[#0F172A] -rotate-12 transform -translate-y-1/2 opacity-60"></div>
            </div>
            <div className="mt-2 flex flex-col items-center">
              <span className="text-xl md:text-2xl font-black tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                FARIA LIMER
              </span>
              <div className="flex gap-4 mt-2">
                <span className="text-[8px] md:text-[10px] font-bold text-yellow-500/40">2026</span>
                <span className="text-[8px] md:text-[10px] font-bold text-yellow-500/40">2026</span>
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-[8px] md:text-[10px] uppercase font-bold tracking-[0.3em] mt-8">Ranking Faria Limer | Quinta</p>
          <p className="text-yellow-500/60 text-[8px] md:text-[10px] uppercase font-bold tracking-[0.1em] mt-2 italic">Onde os campeões se encontram toda quinta-feira!</p>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Título do Clube (Login)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={tituloClube}
                  onChange={(e) => setTituloClube(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 9999"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={senhaCpf}
                  onChange={(e) => setSenhaCpf(e.target.value)}
                  maxLength={4}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'ACESSAR RANKING'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm font-medium text-slate-500">
              Esqueceu sua senha: <span className="text-blue-600 font-bold">envie uma mensagem para o administrador Resetar</span>
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-500 text-xs">
          © 2026 Faria Limer Tennis Club. Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
