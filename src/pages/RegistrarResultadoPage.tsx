import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, User, Trophy, X, Save, AlertCircle, CheckCircle2, MessageSquare, Users, Clock, MapPin, ChevronRight, Info, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { logActivity } from '../services/logService';
import { recalculateRanking } from '../services/rankingService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Player {
  id: string;
  nome: string;
  avatar_url: string | null;
  categoria: string;
  titulo_clube: string;
  ativo?: boolean;
  nivel_acesso?: string;
}

interface Jogo {
  id: string;
  data_jogo: string;
  status: string;
  jogador1: Player;
  jogador2: Player;
  categoria_evento: string;
}

export function RegistrarResultadoPage() {
  const navigate = useNavigate();
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJogo, setSelectedJogo] = useState<Jogo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [placar, setPlacar] = useState({
    set1_j1: 0,
    set1_j2: 0,
    set2_j1: 0,
    set2_j2: 0,
    set3_j1: 0,
    set3_j2: 0,
    tb1_j1: '',
    tb1_j2: '',
    tb2_j1: '',
    tb2_j2: '',
    tb3_j1: '',
    tb3_j2: '',
    is_wo: false,
    vencedor_id: ''
  });

  const fetchJogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          status,
          categoria_evento,
          jogador1:jogador1_id(id, nome, avatar_url, categoria, titulo_clube, ativo, nivel_acesso),
          jogador2:jogador2_id(id, nome, avatar_url, categoria, titulo_clube, ativo, nivel_acesso)
        `)
        .eq('status', 'agendado')
        .order('data_jogo', { ascending: true });

      if (fetchError) throw fetchError;
      if (data) {
        const filteredJogos = (data as any[]).filter(j => 
          j.jogador1?.ativo !== false && 
          j.jogador2?.ativo !== false &&
          j.jogador1?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
          j.jogador2?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
          j.jogador1?.nome !== 'DJOKO MASTER' &&
          j.jogador2?.nome !== 'DJOKO MASTER'
        );
        setJogos(filteredJogos);
      }
    } catch (err: any) {
      console.error('Error fetching jogos:', err);
      setError('Erro ao carregar jogos pendentes: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJogos();
  }, [fetchJogos]);

  useEffect(() => {
    if (!placar.is_wo) {
      const sets_j1 = (placar.set1_j1 > placar.set1_j2 ? 1 : 0) + 
                     (placar.set2_j1 > placar.set2_j2 ? 1 : 0) + 
                     (placar.set3_j1 > placar.set3_j2 ? 1 : 0);
      const sets_j2 = (placar.set1_j2 > placar.set1_j1 ? 1 : 0) + 
                     (placar.set2_j2 > placar.set2_j1 ? 1 : 0) + 
                     (placar.set3_j2 > placar.set3_j1 ? 1 : 0);
      
      if (sets_j1 > sets_j2) {
        setPlacar(prev => ({ ...prev, vencedor_id: selectedJogo?.jogador1.id || '' }));
      } else if (sets_j2 > sets_j1) {
        setPlacar(prev => ({ ...prev, vencedor_id: selectedJogo?.jogador2.id || '' }));
      }
    }
  }, [placar.set1_j1, placar.set1_j2, placar.set2_j1, placar.set2_j2, placar.set3_j1, placar.set3_j2, placar.is_wo, selectedJogo]);

  const handleOpenModal = useCallback((jogo: Jogo) => {
    setSelectedJogo(jogo);
    setPlacar({
      set1_j1: 0,
      set1_j2: 0,
      set2_j1: 0,
      set2_j2: 0,
      set3_j1: 0,
      set3_j2: 0,
      tb1_j1: '',
      tb1_j2: '',
      tb2_j1: '',
      tb2_j2: '',
      tb3_j1: '',
      tb3_j2: '',
      is_wo: false,
      vencedor_id: ''
    });
    setShowModal(true);
    setError(null);
    setSuccess(false);
  }, []);

  const handleSave = async () => {
    if (!selectedJogo) return;
    setSubmitting(true);
    setError(null);

    try {
      let vencedor_id = '';
      const sets_j1 = (placar.set1_j1 > placar.set1_j2 ? 1 : 0) + 
                     (placar.set2_j1 > placar.set2_j2 ? 1 : 0) + 
                     (placar.set3_j1 > placar.set3_j2 ? 1 : 0);
      const sets_j2 = (placar.set1_j2 > placar.set1_j1 ? 1 : 0) + 
                     (placar.set2_j2 > placar.set2_j1 ? 1 : 0) + 
                     (placar.set3_j2 > placar.set3_j1 ? 1 : 0);

      if (placar.is_wo) {
        if (!placar.vencedor_id) throw new Error('Selecione o vencedor do WO');
        vencedor_id = placar.vencedor_id;
      } else {
        if (sets_j1 > sets_j2) vencedor_id = selectedJogo.jogador1.id;
        else if (sets_j2 > sets_j1) vencedor_id = selectedJogo.jogador2.id;
        else throw new Error('O jogo não pode terminar em empate.');
      }

      const formatSet = (j1: number, j2: number, t1: string, t2: string) => {
        let res = `${j1}/${j2}`;
        if (t1 || t2) res += `(${t1 || 0}-${t2 || 0})`;
        return res;
      };

      const { error: insertError } = await supabase
        .from('resultados')
        .insert([{
          jogo_id: selectedJogo.id,
          vencedor_id,
          is_wo: placar.is_wo,
          placar_set1: formatSet(placar.set1_j1, placar.set1_j2, placar.tb1_j1, placar.tb1_j2),
          placar_set2: formatSet(placar.set2_j1, placar.set2_j2, placar.tb2_j1, placar.tb2_j2),
          placar_set3: placar.set3_j1 || placar.set3_j2 ? formatSet(placar.set3_j1, placar.set3_j2, placar.tb3_j1, placar.tb3_j2) : null
        }]);

      if (insertError) throw insertError;

      // Update game status to 'realizado'
      const { error: updateError } = await supabase
        .from('jogos')
        .update({ status: 'realizado' })
        .eq('id', selectedJogo.id);

      if (updateError) throw updateError;

      // REPROCESS EVERYTHING
      await recalculateRanking();

      // Log activity
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('perfis').select('nome').eq('id', user?.id).single();
      if (user && profile) {
        logActivity(
          user.id,
          profile.nome,
          'Registro de Resultado',
          `Resultado registrado para o jogo ${selectedJogo.jogador1.nome} vs ${selectedJogo.jogador2.nome}. Vencedor: ${vencedor_id === selectedJogo.jogador1.id ? selectedJogo.jogador1.nome : selectedJogo.jogador2.nome}`
        );
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        fetchJogos();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      {/* Mobile Back to Home button */}
      <div className="flex justify-end mb-4 lg:hidden">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
        >
          <LayoutDashboard className="w-3 h-3" />
          Início
        </button>
      </div>

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

      <div className="mb-8">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Jogos Pendentes
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : jogos.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Nenhum jogo agendado para registro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {jogos.map((jogo) => (
            <motion.div 
              key={jogo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all group"
            >
              {/* Card Header Info */}
              <div className="px-4 md:px-8 py-3 md:py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="text-[10px] md:text-sm font-black text-[#0F172A] uppercase tracking-tight">
                    {jogo.categoria_evento || 'Qualifying'}
                  </span>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1 md:gap-1.5 text-slate-500 text-[10px] md:text-xs font-bold">
                    <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    {format(new Date(jogo.data_jogo), 'HH:mm')}
                  </div>
                </div>
              </div>

              {/* Match Content */}
              <div className="p-4 md:p-8">
                <div className="space-y-6 md:space-y-8">
                  {/* Player 1 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-5">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
                        <img 
                          src={jogo.jogador1.avatar_url || `https://ui-avatars.com/api/?name=${jogo.jogador1.nome}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-5 h-3 md:w-6 md:h-4 bg-slate-200 rounded-sm overflow-hidden shadow-sm">
                          <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm md:text-xl font-black text-slate-900 leading-none">{jogo.jogador1.nome}</span>
                          <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">({jogo.jogador1.titulo_clube})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-lg md:rounded-xl flex items-center justify-center text-slate-200 font-black text-sm md:text-lg">-</div>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-lg md:rounded-xl flex items-center justify-center text-slate-200 font-black text-sm md:text-lg">-</div>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-5">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
                        <img 
                          src={jogo.jogador2.avatar_url || `https://ui-avatars.com/api/?name=${jogo.jogador2.nome}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-5 h-3 md:w-6 md:h-4 bg-slate-200 rounded-sm overflow-hidden shadow-sm">
                          <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm md:text-xl font-black text-slate-900 leading-none">{jogo.jogador2.nome}</span>
                          <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">({jogo.jogador2.titulo_clube})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-lg md:rounded-xl flex items-center justify-center text-slate-200 font-black text-sm md:text-lg">-</div>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-lg md:rounded-xl flex items-center justify-center text-slate-200 font-black text-sm md:text-lg">-</div>
                    </div>
                  </div>
                </div>

                {/* Info & Summary Placeholder */}
                <div className="mt-6 md:mt-8 space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[9px] md:text-[11px] font-bold">
                    <span>Ump: Faria Limer Official</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 md:pt-6 border-t border-slate-100 gap-4">
                    <div className="flex gap-2">
                      <button className="flex-1 sm:flex-none px-4 md:px-5 py-2 border border-slate-200 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">H2H</button>
                      <button className="flex-1 sm:flex-none px-4 md:px-5 py-2 border border-slate-200 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Stats</button>
                    </div>
                    <button 
                      onClick={() => handleOpenModal(jogo)}
                      className="flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 bg-[#0F172A] text-white rounded-lg md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                    >
                      <Trophy className="w-3.5 md:w-4 h-3.5 md:h-4" />
                      Registrar Placar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ATP Style Modal */}
      <AnimatePresence>
        {showModal && selectedJogo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] md:text-xs font-black text-yellow-600 uppercase italic">ATP Scorecard</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedJogo.categoria_evento}</span>
                  </div>
                  <h2 className="text-lg md:text-2xl font-black text-[#0F172A]">Lançamento de Placar</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 md:p-3 hover:bg-white rounded-xl md:rounded-2xl transition-all shadow-sm">
                  <X className="w-5 md:w-6 h-5 md:h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-10 overflow-y-auto flex-1 custom-scrollbar">
                {/* Simplified Match Header */}
                <div className="flex items-center justify-between mb-8 md:mb-12 px-2 md:px-4">
                  <div className="flex flex-col items-center gap-2 md:gap-3 w-1/3">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-slate-100 shadow-lg">
                      <img 
                        src={selectedJogo.jogador1.avatar_url || `https://ui-avatars.com/api/?name=${selectedJogo.jogador1.nome}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] md:text-sm font-black text-slate-900 text-center uppercase tracking-tight line-clamp-2">{selectedJogo.jogador1.nome}</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 md:gap-2">
                    <div className="px-2 md:px-4 py-0.5 md:py-1 bg-slate-100 rounded-full">
                      <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Versus</span>
                    </div>
                    <div className="h-px w-8 md:w-12 bg-slate-200"></div>
                  </div>

                  <div className="flex flex-col items-center gap-2 md:gap-3 w-1/3">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-slate-100 shadow-lg">
                      <img 
                        src={selectedJogo.jogador2.avatar_url || `https://ui-avatars.com/api/?name=${selectedJogo.jogador2.nome}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] md:text-sm font-black text-slate-900 text-center uppercase tracking-tight line-clamp-2">{selectedJogo.jogador2.nome}</span>
                  </div>
                </div>

                {/* Score Entry Grid */}
                <div className="space-y-6 md:space-y-8 bg-slate-50 p-4 md:p-8 rounded-[24px] md:rounded-[40px] border border-slate-100">
                  <div className="grid grid-cols-4 gap-2 md:gap-4 items-center">
                    <div className="col-span-1"></div>
                    <div className="text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Set 1</div>
                    <div className="text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Set 2</div>
                    <div className="text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Set 3</div>

                    {/* Player 1 Scores */}
                    <div className="text-[10px] md:text-xs font-black text-slate-600 uppercase truncate">{selectedJogo.jogador1.nome.split(' ')[0]}</div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        value={placar.set1_j1}
                        onChange={(e) => setPlacar({ ...placar, set1_j1: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 md:h-14 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl text-center font-black text-base md:text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="TB"
                        value={placar.tb1_j1}
                        onChange={(e) => setPlacar({ ...placar, tb1_j1: e.target.value })}
                        className="w-full h-4 md:h-6 bg-transparent text-[8px] md:text-[10px] text-center font-bold text-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        value={placar.set2_j1}
                        onChange={(e) => setPlacar({ ...placar, set2_j1: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 md:h-14 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl text-center font-black text-base md:text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="TB"
                        value={placar.tb2_j1}
                        onChange={(e) => setPlacar({ ...placar, tb2_j1: e.target.value })}
                        className="w-full h-4 md:h-6 bg-transparent text-[8px] md:text-[10px] text-center font-bold text-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        value={placar.set3_j1}
                        onChange={(e) => setPlacar({ ...placar, set3_j1: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 md:h-14 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl text-center font-black text-base md:text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="TB"
                        value={placar.tb3_j1}
                        onChange={(e) => setPlacar({ ...placar, tb3_j1: e.target.value })}
                        className="w-full h-4 md:h-6 bg-transparent text-[8px] md:text-[10px] text-center font-bold text-blue-500 outline-none"
                      />
                    </div>

                    {/* Player 2 Scores */}
                    <div className="text-[10px] md:text-xs font-black text-slate-600 uppercase truncate">{selectedJogo.jogador2.nome.split(' ')[0]}</div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        value={placar.set1_j2}
                        onChange={(e) => setPlacar({ ...placar, set1_j2: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 md:h-14 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl text-center font-black text-base md:text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="TB"
                        value={placar.tb1_j2}
                        onChange={(e) => setPlacar({ ...placar, tb1_j2: e.target.value })}
                        className="w-full h-4 md:h-6 bg-transparent text-[8px] md:text-[10px] text-center font-bold text-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        value={placar.set2_j2}
                        onChange={(e) => setPlacar({ ...placar, set2_j2: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 md:h-14 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl text-center font-black text-base md:text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="TB"
                        value={placar.tb2_j2}
                        onChange={(e) => setPlacar({ ...placar, tb2_j2: e.target.value })}
                        className="w-full h-4 md:h-6 bg-transparent text-[8px] md:text-[10px] text-center font-bold text-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        value={placar.set3_j2}
                        onChange={(e) => setPlacar({ ...placar, set3_j2: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 md:h-14 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl text-center font-black text-base md:text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="TB"
                        value={placar.tb3_j2}
                        onChange={(e) => setPlacar({ ...placar, tb3_j2: e.target.value })}
                        className="w-full h-4 md:h-6 bg-transparent text-[8px] md:text-[10px] text-center font-bold text-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* WO & Winner Selection */}
                <div className="mt-8 md:mt-10 space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between px-2 md:px-4">
                    <label className="flex items-center gap-2 md:gap-3 cursor-pointer group">
                      <div className={cn(
                        "w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        placar.is_wo ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/20" : "border-slate-300 group-hover:border-slate-400"
                      )}>
                        {placar.is_wo && <CheckCircle2 className="w-3 md:w-4 h-3 md:h-4 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={placar.is_wo}
                        onChange={(e) => setPlacar({ ...placar, is_wo: e.target.checked })}
                        className="hidden"
                      />
                      <span className="text-[10px] md:text-xs font-black text-slate-600 uppercase tracking-widest">Vitória por WO</span>
                    </label>
                    <div className="flex items-center gap-1 md:gap-2 text-slate-400">
                      <Trophy className="w-3 md:w-4 h-3 md:h-4" />
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Vencedor</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <button 
                      onClick={() => setPlacar({ ...placar, vencedor_id: selectedJogo.jogador1.id })}
                      className={cn(
                        "p-4 md:p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all font-black text-[10px] md:text-sm uppercase tracking-tight flex flex-col items-center gap-2 md:gap-3",
                        placar.vencedor_id === selectedJogo.jogador1.id 
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/10" 
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all",
                        placar.vencedor_id === selectedJogo.jogador1.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-300"
                      )}>
                        <Trophy className="w-4 md:w-5 h-4 md:h-5" />
                      </div>
                      <span className="truncate w-full text-center">{selectedJogo.jogador1.nome}</span>
                    </button>
                    <button 
                      onClick={() => setPlacar({ ...placar, vencedor_id: selectedJogo.jogador2.id })}
                      className={cn(
                        "p-4 md:p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all font-black text-[10px] md:text-sm uppercase tracking-tight flex flex-col items-center gap-2 md:gap-3",
                        placar.vencedor_id === selectedJogo.jogador2.id 
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/10" 
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all",
                        placar.vencedor_id === selectedJogo.jogador2.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-300"
                      )}>
                        <Trophy className="w-4 md:w-5 h-4 md:h-5" />
                      </div>
                      <span className="truncate w-full text-center">{selectedJogo.jogador2.nome}</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-3 text-xs font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    Resultado salvo com sucesso!
                  </motion.div>
                )}
              </div>

              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 flex-shrink-0">
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all text-[10px] md:text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-[#0F172A] text-white font-black rounded-xl md:rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3 text-[10px] md:text-xs uppercase tracking-widest"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Finalizar Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}
