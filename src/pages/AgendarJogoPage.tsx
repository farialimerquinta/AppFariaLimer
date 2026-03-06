import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, User, FileText, Send, AlertCircle, CheckCircle2, Trophy, Loader2, Clock } from 'lucide-react';
import { supabase } from '../services/supabase';
import { logActivity } from '../services/logService';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { cn } from '../utils';

interface Player {
  id: string;
  nome: string;
  titulo_clube?: string;
  categoria?: string;
  ativo?: boolean;
  nivel_acesso?: string;
}

export function AgendarJogoPage() {
  const { user } = useAuth();
  const [jogadores, setJogadores] = useState<Player[]>([]);
  const [filteredJogadores, setFilteredJogadores] = useState<Player[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    data_jogo: '',
    jogador1_id: '',
    jogador2_id: '',
    categoria_evento: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchJogadores();
  }, []);

  useEffect(() => {
    if (formData.categoria_evento) {
      const filtered = jogadores.filter(j => 
        j.categoria === formData.categoria_evento && 
        j.ativo !== false &&
        j.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
        j.nome !== 'DJOKO MASTER'
      );
      setFilteredJogadores(filtered);
      // Reset players if they don't belong to the new category
      setFormData(prev => ({
        ...prev,
        jogador1_id: '',
        jogador2_id: ''
      }));
    } else {
      setFilteredJogadores([]);
    }
  }, [formData.categoria_evento, jogadores]);

  const fetchJogadores = async () => {
    const { data } = await supabase
      .from('perfis')
      .select('id, nome, titulo_clube, categoria, ativo, nivel_acesso')
      .order('nome');
    
    if (data) {
      setJogadores(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!formData.categoria_evento) {
      setError('Por favor, selecione a categoria do evento.');
      setSubmitting(false);
      return;
    }

    if (!formData.jogador1_id || !formData.jogador2_id) {
      setError('Por favor, selecione ambos os jogadores.');
      setSubmitting(false);
      return;
    }

    if (formData.jogador1_id === formData.jogador2_id) {
      setError('Os jogadores devem ser diferentes.');
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('jogos')
      .insert([
        {
          ...formData,
          status: 'agendado'
        }
      ]);

    if (insertError) {
      setError(insertError.message);
    } else {
      // Log activity
      if (user) {
        const j1 = jogadores.find(j => j.id === formData.jogador1_id)?.nome;
        const j2 = jogadores.find(j => j.id === formData.jogador2_id)?.nome;
        logActivity(
          user.id, 
          user.nome, 
          'Agendamento de Jogo', 
          `Jogo agendado: ${j1} vs ${j2} em ${formData.data_jogo} (${formData.categoria_evento})`
        );
      }

      setSuccess(true);
      setFormData({
        data_jogo: '',
        jogador1_id: '',
        jogador2_id: '',
        categoria_evento: '',
        observacoes: ''
      });
      setTimeout(() => setSuccess(false), 3000);
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="relative bg-[#0F172A] rounded-[32px] md:rounded-[40px] p-6 md:p-8 mb-8 md:mb-10 text-center overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1595435066359-62f32ff9d51d?q=80&w=1920&auto=format&fit=crop" 
            alt="Tennis Court" 
            className="w-full h-full object-cover opacity-10"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/60 to-[#0F172A]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center group cursor-pointer mb-4">
            <div className="relative pr-4">
              <span className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-2xl">
                ATP
              </span>
              <div className="absolute top-1/2 left-0 w-[calc(100%-1rem)] h-[2px] bg-white -rotate-12 transform -translate-y-1/2 opacity-40"></div>
            </div>
            <div className="mt-1 flex flex-col items-center">
              <span className="text-sm md:text-lg font-black tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                FARIA LIMER
              </span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2 italic tracking-tight uppercase">
            RANKING FARIA LIMER <span className="text-yellow-500">|</span> QUINTA
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            Onde os campeões se encontram toda quinta-feira!
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
            
            {/* Step 1: Category and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  <Trophy className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  1. Categoria / Evento
                </label>
                <select 
                  required
                  value={formData.categoria_evento}
                  onChange={(e) => setFormData({ ...formData, categoria_evento: e.target.value })}
                  className="w-full h-12 md:h-16 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-6 font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                >
                  <option value="">Selecione a Categoria</option>
                  <option value="Grand Slam">Grand Slam</option>
                  <option value="ATP 1000">ATP 1000</option>
                  <option value="ATP 500">ATP 500</option>
                  <option value="ATP 250">ATP 250</option>
                  <option value="Challenger">Challenger</option>
                </select>
              </div>

              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  <CalendarIcon className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  2. Data e Hora
                </label>
                <input 
                  type="datetime-local"
                  required
                  value={formData.data_jogo}
                  onChange={(e) => setFormData({ ...formData, data_jogo: e.target.value })}
                  className="w-full h-12 md:h-16 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-6 font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Step 2: Players Selection */}
            <div className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 relative transition-all duration-500",
              !formData.categoria_evento ? "opacity-30 pointer-events-none grayscale" : "opacity-100"
            )}>
              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase italic">VS</span>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  <User className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  3. Jogador 1 ({formData.categoria_evento || 'Selecione Categoria'})
                </label>
                <select 
                  required
                  disabled={!formData.categoria_evento}
                  value={formData.jogador1_id}
                  onChange={(e) => setFormData({ ...formData, jogador1_id: e.target.value })}
                  className="w-full h-12 md:h-16 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-6 font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o Jogador 1</option>
                  {filteredJogadores.map(j => (
                    <option key={j.id} value={j.id}>{j.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  <User className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  4. Jogador 2 ({formData.categoria_evento || 'Selecione Categoria'})
                </label>
                <select 
                  required
                  disabled={!formData.categoria_evento}
                  value={formData.jogador2_id}
                  onChange={(e) => setFormData({ ...formData, jogador2_id: e.target.value })}
                  className="w-full h-12 md:h-16 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-6 font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o Jogador 2</option>
                  {filteredJogadores.map(j => (
                    <option key={j.id} value={j.id}>{j.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-3 md:space-y-4">
              <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                <FileText className="w-3.5 md:w-4 h-3.5 md:h-4" />
                5. Observações (Opcional)
              </label>
              <textarea 
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Local, quadra, ou detalhes adicionais..."
                className="w-full h-24 md:h-32 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <CheckCircle2 className="w-4 h-4" />
                Jogo agendado com sucesso!
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="pt-4 md:pt-6">
              <button 
                type="submit"
                disabled={submitting}
                className="w-full h-14 md:h-20 bg-[#0F172A] text-white rounded-xl md:rounded-[32px] font-black text-xs md:text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 md:gap-4"
              >
                {submitting ? (
                  <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin" />
                ) : (
                  <>
                    <CalendarIcon className="w-5 md:w-6 h-5 md:h-6" />
                    Confirmar Agendamento
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
