import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { motion } from 'motion/react';
import { cn } from '../utils';

export function ResetDataPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();

  const handleReset = async () => {
    if (confirmText !== 'RESETAR') {
      setError('Por favor, digite RESETAR para confirmar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Saves the final ranking, archives played games and zeroes points only.
      // Nothing is deleted: wins, losses and games stay as career stats.
      const { error: temporadaError } = await supabase.rpc('fn_nova_temporada');

      if (temporadaError) throw temporadaError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting data:', err);
      setError('Erro ao zerar os pontos. Verifique as permissões do banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto bg-slate-50 min-h-screen">
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

      <div className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xl border border-slate-100">
        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">Nova Temporada!</h2>
            <p className="text-slate-500 font-medium mb-8">Os pontos foram zerados. Jogos, vitórias e derrotas continuam nas estatísticas de carreira e no H2H.</p>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3 }}
                className="bg-emerald-500 h-full"
              />
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-start gap-4 p-6 bg-red-50 rounded-3xl border border-red-100">
              <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
              <div>
                <h3 className="font-black text-red-900 uppercase italic mb-1">Atenção: Virada de Temporada</h3>
                <p className="text-sm text-red-700 font-medium">
                  Esta ação zera os pontos de todos os jogadores para começar uma nova temporada. Nenhum jogo é apagado: vitórias, derrotas e confrontos continuam nas estatísticas de carreira e no H2H. O ranking final é guardado no backup antes de zerar.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest text-center">
                Para confirmar, digite <span className="text-red-600">RESETAR</span> abaixo:
              </p>
              <input 
                type="text" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite RESETAR"
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center font-black text-xl focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={handleReset}
                disabled={loading || confirmText !== 'RESETAR'}
                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                ZERAR PONTOS DA TEMPORADA
              </button>
              
              <button
                onClick={() => navigate('/')}
                disabled={loading}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancelar e Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
