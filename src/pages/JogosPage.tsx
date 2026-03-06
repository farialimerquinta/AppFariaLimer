import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, Filter, Search, Trophy, Timer, MapPin, ExternalLink, Edit2, X, Save, AlertCircle, Loader2, Trash2, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { logActivity } from '../services/logService';
import { recalculateRanking } from '../services/rankingService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Jogo {
  id: string;
  data_jogo: string;
  status: string;
  categoria_evento: string;
  jogador1: { id: string; nome: string; avatar_url: string | null; ativo?: boolean };
  jogador2: { id: string; nome: string; avatar_url: string | null; ativo?: boolean };
  resultado?: {
    vencedor_id: string;
    placar_set1: string;
    placar_set2: string;
    placar_set3: string | null;
    is_wo: boolean;
  };
}

export function JogosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'agendado' | 'realizado'>('todos');

  // Edit State
  const [selectedJogo, setSelectedJogo] = useState<Jogo | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Jogo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    try {
      let query = supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          status,
          categoria_evento,
          jogador1:jogador1_id(id, nome, avatar_url, ativo, nivel_acesso),
          jogador2:jogador2_id(id, nome, avatar_url, ativo, nivel_acesso),
          resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
        `)
        .order('data_jogo', { ascending: false });

      if (filter !== 'todos') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      if (data) {
        const filteredJogos = (data as any[]).filter(j => 
          j.jogador1?.ativo !== false && j.jogador2?.ativo !== false &&
          j.jogador1?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' && j.jogador2?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
          j.jogador1?.nome !== 'DJOKO MASTER' && j.jogador2?.nome !== 'DJOKO MASTER'
        );
        setJogos(filteredJogos);
      }
    } catch (err) {
      console.error('Error fetching jogos:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchJogos();
  }, [fetchJogos]);

  const handleDeleteGame = useCallback(async () => {
    if (!gameToDelete) return;
    
    const gameId = gameToDelete.id;
    setDeletingId(gameId);
    setError(null);
    
    try {
      // 1. Delete results first (foreign key constraint safety)
      const { error: resError } = await supabase
        .from('resultados')
        .delete()
        .eq('jogo_id', gameId);
      
      if (resError) {
        console.error('Error deleting results:', resError);
        throw new Error(`Erro ao apagar resultados: ${resError.message}`);
      }
      
      // 2. Delete the game itself
      const { error: gameError } = await supabase
        .from('jogos')
        .delete()
        .eq('id', gameId);

      if (gameError) {
        console.error('Error deleting game:', gameError);
        throw new Error(`Erro ao apagar jogo: ${gameError.message}`);
      }

      // 3. Log activity (don't let log failure stop the process)
      if (user) {
        try {
          await logActivity(
            user.id,
            user.nome,
            'Exclusão de Jogo',
            `Confronto entre ${gameToDelete.jogador1.nome} e ${gameToDelete.jogador2.nome} foi removido.`
          );
        } catch (logErr) {
          console.warn('Log failed but game was deleted:', logErr);
        }
      }

      // 4. Reprocess ranking to remove points
      await recalculateRanking();

      // 5. Success state and cleanup
      setSuccess(true);
      setTimeout(() => {
        setGameToDelete(null);
        setSuccess(false);
        fetchJogos();
      }, 1500);
      
    } catch (err: any) {
      console.error('Full error context:', err);
      setError(err.message || 'Erro inesperado ao apagar o jogo.');
    } finally {
      setDeletingId(null);
    }
  }, [gameToDelete, fetchJogos, user]);

  const renderedJogos = useMemo(() => {
    return jogos.map((jogo) => {
      const isLive = new Date(jogo.data_jogo).toDateString() === new Date().toDateString() && jogo.status === 'agendado';
      
      const getSetScores = (setStr: string | null) => {
        if (!setStr) return null;
        const parts = setStr.split('/');
        return {
          j1: parseInt(parts[0]) || 0,
          j2: parseInt(parts[1]) || 0
        };
      };

      const s1 = getSetScores(jogo.resultado?.placar_set1 || null);
      const s2 = getSetScores(jogo.resultado?.placar_set2 || null);
      const s3 = getSetScores(jogo.resultado?.placar_set3 || null);

      const isWinner1 = jogo.status === 'realizado' && jogo.resultado?.vencedor_id === (jogo.jogador1 as any).id;
      const isWinner2 = jogo.status === 'realizado' && jogo.resultado?.vencedor_id === (jogo.jogador2 as any).id;

      const handleEdit = () => {
        setSelectedJogo(jogo);
        const res = jogo.resultado;
        if (res) {
          const parseSet = (setStr: string | null) => {
            if (!setStr) return { j1: 0, j2: 0, t1: '', t2: '' };
            const mainPart = setStr.split('(')[0];
            const tbPart = setStr.split('(')[1]?.replace(')', '') || '';
            const parts = mainPart.split('/');
            const tbParts = tbPart.split('-');
            return {
              j1: parseInt(parts[0]) || 0,
              j2: parseInt(parts[1]) || 0,
              t1: tbParts[0] || '',
              t2: tbParts[1] || ''
            };
          };

          const ps1 = parseSet(res.placar_set1);
          const ps2 = parseSet(res.placar_set2);
          const ps3 = parseSet(res.placar_set3);

          setPlacar({
            set1_j1: ps1.j1,
            set1_j2: ps1.j2,
            set2_j1: ps2.j1,
            set2_j2: ps2.j2,
            set3_j1: ps3.j1,
            set3_j2: ps3.j2,
            tb1_j1: ps1.t1,
            tb1_j2: ps1.t2,
            tb2_j1: ps2.t1,
            tb2_j2: ps2.t2,
            tb3_j1: ps3.t1,
            tb3_j2: ps3.t2,
            is_wo: res.is_wo,
            vencedor_id: res.vencedor_id
          });
        }
        setShowEditModal(true);
      };

      return (
        <motion.div
          key={jogo.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 p-4 md:p-8 shadow-sm hover:shadow-xl transition-all group"
        >
          {/* Card Header: Round & Status */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <h3 className="text-base md:text-xl font-black text-[#0F172A] tracking-tight">
                {jogo.categoria_evento || 'Round of 32'}
              </h3>
              {isLive && (
                <span className="bg-red-500 text-white text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  Live
                </span>
              )}
              <span className="text-slate-400 text-[10px] md:text-sm font-medium flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                Central
              </span>
            </div>
            <div className="flex items-center gap-1 md:gap-2 text-slate-400 font-mono text-[10px] md:text-sm font-bold">
              <Timer className="w-3 h-3 md:w-4 md:h-4" />
              {format(new Date(jogo.data_jogo), 'HH:mm')}
            </div>
          </div>

          {/* Players & Score Section */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex-1 space-y-4 md:space-y-6">
              {/* Player 1 Row */}
              <div className={cn(
                "flex items-center justify-between group/p1 transition-all p-1.5 md:p-2 rounded-xl md:rounded-2xl",
                isWinner1 ? "bg-blue-50/50" : ""
              )}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 shadow-sm group-hover/p1:scale-110 transition-transform",
                    isWinner1 ? "border-blue-400" : "border-slate-100"
                  )}>
                    <img 
                      src={(jogo.jogador1 as any).avatar_url || `https://ui-avatars.com/api/?name=${(jogo.jogador1 as any).nome}`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-5 h-3.5 md:w-6 md:h-4 object-cover rounded-sm shadow-sm" />
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-sm md:text-lg font-black tracking-tight",
                        isWinner1 ? "text-blue-600" : "text-[#0F172A]"
                      )}>
                        {(jogo.jogador1 as any).nome}
                      </span>
                      {isWinner1 && (
                        <span className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-widest">Vencedor</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  {jogo.status === 'realizado' && s1 && (
                    <div className="flex gap-2 md:gap-3">
                      <span className={cn(
                        "text-base md:text-xl font-black transition-all",
                        s1.j1 > s1.j2 ? "text-[#0F172A] scale-110" : "text-slate-300"
                      )}>{s1.j1}</span>
                      {s2 && (
                        <span className={cn(
                          "text-base md:text-xl font-black transition-all",
                          s2.j1 > s2.j2 ? "text-[#0F172A] scale-110" : "text-slate-300"
                        )}>{s2.j1}</span>
                      )}
                      {s3 && (
                        <span className={cn(
                          "text-base md:text-xl font-black transition-all",
                          s3.j1 > s3.j2 ? "text-[#0F172A] scale-110" : "text-slate-300"
                        )}>{s3.j1}</span>
                      )}
                    </div>
                  )}
                  {jogo.status === 'agendado' && (
                    <div className="flex gap-2 md:gap-3">
                      <span className="text-base md:text-xl font-black text-slate-100 italic">VS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Player 2 Row */}
              <div className={cn(
                "flex items-center justify-between group/p2 transition-all p-1.5 md:p-2 rounded-xl md:rounded-2xl",
                isWinner2 ? "bg-blue-50/50" : ""
              )}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 shadow-sm group-hover/p2:scale-110 transition-transform",
                    isWinner2 ? "border-blue-400" : "border-slate-100"
                  )}>
                    <img 
                      src={(jogo.jogador2 as any).avatar_url || `https://ui-avatars.com/api/?name=${(jogo.jogador2 as any).nome}`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-5 h-3.5 md:w-6 md:h-4 object-cover rounded-sm shadow-sm" />
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-sm md:text-lg font-black tracking-tight",
                        isWinner2 ? "text-blue-600" : "text-[#0F172A]"
                      )}>
                        {(jogo.jogador2 as any).nome}
                      </span>
                      {isWinner2 && (
                        <span className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-widest">Vencedor</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  {jogo.status === 'realizado' && s1 && (
                    <div className="flex gap-2 md:gap-3">
                      <span className={cn(
                        "text-base md:text-xl font-black transition-all",
                        s1.j2 > s1.j1 ? "text-[#0F172A] scale-110" : "text-slate-300"
                      )}>{s1.j2}</span>
                      {s2 && (
                        <span className={cn(
                          "text-base md:text-xl font-black transition-all",
                          s2.j2 > s2.j1 ? "text-[#0F172A] scale-110" : "text-slate-300"
                        )}>{s2.j2}</span>
                      )}
                      {s3 && (
                        <span className={cn(
                          "text-base md:text-xl font-black transition-all",
                          s3.j2 > s3.j1 ? "text-[#0F172A] scale-110" : "text-slate-300"
                        )}>{s3.j2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Umpire & Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pt-4 md:pt-6 border-t border-slate-50">
            <div>
              <p className="text-[10px] md:text-sm font-medium text-slate-400">Ump: <span className="text-slate-600 font-bold">Faria Limer Official</span></p>
              <p className="text-[9px] md:text-xs text-slate-400 mt-1 md:mt-2 italic">
                {jogo.status === 'realizado' 
                  ? `${(jogo.jogador1 as any).nome} vs ${(jogo.jogador2 as any).nome}. Match completed.`
                  : `${(jogo.jogador1 as any).nome.split(' ')[0]} vs ${(jogo.jogador2 as any).nome.split(' ')[0]}. Match scheduled for ${format(new Date(jogo.data_jogo), 'HH:mm')}.`
                }
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex-1 md:flex-none px-3 md:px-4 py-2 border border-slate-200 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">H2H</button>
              <button className="flex-1 md:flex-none px-3 md:px-4 py-2 border border-slate-200 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Stats</button>
              
              {jogo.status === 'agendado' ? (
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setGameToDelete(jogo)}
                    disabled={(user?.nivel_acesso !== 'ADMIN_MASTER' && user?.nivel_acesso !== 'ADMIN_TENISTA') || deletingId === jogo.id}
                    className={cn(
                      "flex-1 md:flex-none px-4 md:px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2",
                      (user?.nivel_acesso === 'ADMIN_MASTER' || user?.nivel_acesso === 'ADMIN_TENISTA') 
                        ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed opacity-60"
                    )}
                  >
                    <Trash2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Apagar
                  </button>
                  <a 
                    href="/registrar-resultado"
                    className="flex-[2] md:flex-none px-4 md:px-6 py-2 bg-[#0F172A] text-white rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Registrar
                  </a>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleEdit}
                    disabled={user?.nivel_acesso !== 'ADMIN_MASTER' && user?.nivel_acesso !== 'ADMIN_TENISTA'}
                    className={cn(
                      "flex-1 md:flex-none px-4 md:px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2",
                      (user?.nivel_acesso === 'ADMIN_MASTER' || user?.nivel_acesso === 'ADMIN_TENISTA') 
                        ? "bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed opacity-60"
                    )}
                  >
                    <Edit2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Editar
                  </button>
                  <button className="flex-1 md:flex-none px-4 md:px-4 py-2 border border-slate-200 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2">
                    <ExternalLink className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Watch
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      );
    });
  }, [jogos]);

  const handleSaveEdit = async () => {
    if (!selectedJogo) return;
    setSubmitting(true);
    setError(null);

    try {
      const formatSet = (j1: number, j2: number, t1: string, t2: string) => {
        let res = `${j1}/${j2}`;
        if (t1 || t2) res += `(${t1 || 0}-${t2 || 0})`;
        return res;
      };

      // Check if score is 0-0 (reset)
      const isReset = placar.set1_j1 === 0 && placar.set1_j2 === 0 && 
                      placar.set2_j1 === 0 && placar.set2_j2 === 0 && 
                      (placar.set3_j1 === 0 && placar.set3_j2 === 0) && 
                      !placar.is_wo;

      if (isReset) {
        // Delete result and set status back to agendado
        const { error: deleteResError } = await supabase
          .from('resultados')
          .delete()
          .eq('jogo_id', selectedJogo.id);
        
        if (deleteResError) throw deleteResError;

        const { error: updateStatusError } = await supabase
          .from('jogos')
          .update({ status: 'agendado' })
          .eq('id', selectedJogo.id);
        
        if (updateStatusError) throw updateStatusError;
      } else {
        const { error: updateError } = await supabase
          .from('resultados')
          .update({
            vencedor_id: placar.vencedor_id,
            is_wo: placar.is_wo,
            placar_set1: formatSet(placar.set1_j1, placar.set1_j2, placar.tb1_j1, placar.tb1_j2),
            placar_set2: formatSet(placar.set2_j1, placar.set2_j2, placar.tb2_j1, placar.tb2_j2),
            placar_set3: placar.set3_j1 || placar.set3_j2 ? formatSet(placar.set3_j1, placar.set3_j2, placar.tb3_j1, placar.tb3_j2) : null
          })
          .eq('jogo_id', selectedJogo.id);

        if (updateError) throw updateError;
      }

      // REPROCESS EVERYTHING
      await recalculateRanking();

      setSuccess(true);
      setTimeout(() => {
        setShowEditModal(false);
        setSuccess(false);
        fetchJogos();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {gameToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A] mb-4">Apagar Confronto?</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  Você está prestes a remover permanentemente o jogo entre <br/>
                  <span className="font-black text-slate-900">{gameToDelete.jogador1.nome}</span> e <br/>
                  <span className="font-black text-slate-900">{gameToDelete.jogador2.nome}</span>.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold text-left">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-3 text-xs font-bold text-left">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    Confronto removido com sucesso!
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleDeleteGame}
                    disabled={deletingId !== null || success}
                    className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deletingId ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    {deletingId ? 'REMOVENDO...' : 'SIM, APAGAR AGORA'}
                  </button>
                  <button 
                    onClick={() => setGameToDelete(null)}
                    disabled={deletingId !== null || success}
                    className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedJogo && (
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
                  <h2 className="text-lg md:text-2xl font-black text-[#0F172A]">Editar Placar</h2>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 md:p-3 hover:bg-white rounded-xl md:rounded-2xl transition-all shadow-sm">
                  <X className="w-5 md:w-6 h-5 md:h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-10 overflow-y-auto flex-1 custom-scrollbar">
                {/* Simplified Match Header */}
                <div className="flex items-center justify-between mb-8 md:mb-12 px-2 md:px-4">
                  <div className="flex flex-col items-center gap-2 md:gap-3 w-1/3">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-slate-100 shadow-lg">
                      <img 
                        src={(selectedJogo.jogador1 as any).avatar_url || `https://ui-avatars.com/api/?name=${(selectedJogo.jogador1 as any).nome}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] md:text-sm font-black text-slate-900 text-center uppercase tracking-tight line-clamp-2">{(selectedJogo.jogador1 as any).nome}</span>
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
                        src={(selectedJogo.jogador2 as any).avatar_url || `https://ui-avatars.com/api/?name=${(selectedJogo.jogador2 as any).nome}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] md:text-sm font-black text-slate-900 text-center uppercase tracking-tight line-clamp-2">{(selectedJogo.jogador2 as any).nome}</span>
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
                    <div className="text-[10px] md:text-xs font-black text-slate-600 uppercase truncate">{(selectedJogo.jogador1 as any).nome.split(' ')[0]}</div>
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
                    <div className="text-[10px] md:text-xs font-black text-slate-600 uppercase truncate">{(selectedJogo.jogador2 as any).nome.split(' ')[0]}</div>
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
                      onClick={() => setPlacar({ ...placar, vencedor_id: (selectedJogo.jogador1 as any).id })}
                      className={cn(
                        "p-4 md:p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all font-black text-[10px] md:text-sm uppercase tracking-tight flex flex-col items-center gap-2 md:gap-3",
                        placar.vencedor_id === (selectedJogo.jogador1 as any).id 
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/10" 
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all",
                        placar.vencedor_id === (selectedJogo.jogador1 as any).id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-300"
                      )}>
                        <Trophy className="w-4 md:w-5 h-4 md:h-5" />
                      </div>
                      <span className="truncate w-full text-center">{(selectedJogo.jogador1 as any).nome}</span>
                    </button>
                    <button 
                      onClick={() => setPlacar({ ...placar, vencedor_id: (selectedJogo.jogador2 as any).id })}
                      className={cn(
                        "p-4 md:p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all font-black text-[10px] md:text-sm uppercase tracking-tight flex flex-col items-center gap-2 md:gap-3",
                        placar.vencedor_id === (selectedJogo.jogador2 as any).id 
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/10" 
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all",
                        placar.vencedor_id === (selectedJogo.jogador2 as any).id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-300"
                      )}>
                        <Trophy className="w-4 md:w-5 h-4 md:h-5" />
                      </div>
                      <span className="truncate w-full text-center">{(selectedJogo.jogador2 as any).nome}</span>
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
                    Resultado atualizado com sucesso!
                  </motion.div>
                )}
              </div>

              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 flex-shrink-0">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all text-[10px] md:text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-[#0F172A] text-white font-black rounded-xl md:rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3 text-[10px] md:text-xs uppercase tracking-widest"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            <div className="relative">
              <span className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-2xl">
                ATP
              </span>
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white -rotate-12 transform -translate-y-1/2 opacity-40"></div>
            </div>
            <div className="mt-1 flex flex-col items-center">
              <span className="text-sm md:text-lg font-black tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                FARIA LIMER
              </span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2 italic tracking-tight uppercase">
            Agenda de <span className="text-yellow-500">Jogos</span>
          </h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Jogos</h1>
          <p className="text-slate-500">Histórico de partidas e próximos confrontos.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {(['todos', 'agendado', 'realizado'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                filter === f 
                  ? "bg-[#0F172A] text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {f === 'todos' ? 'Todos' : f === 'agendado' ? 'Agendados' : 'Realizados'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : jogos.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Nenhum jogo encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {renderedJogos}
        </div>
      )}
    </div>
  );
}
