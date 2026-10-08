import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Medal, TrendingUp, Calendar, User, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Player {
  id: string;
  nome: string;
  categoria: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
  games_ganhos: number;
  games_perdidos: number;
  taxa_vitoria: number;
  avatar_url: string | null;
}

interface Jogo {
  id: string;
  data_jogo: string;
  status: string;
  categoria_evento: string;
  jogador1: { id: string; nome: string; avatar_url: string | null };
  jogador2: { id: string; nome: string; avatar_url: string | null };
  resultado?: {
    vencedor_id: string;
    placar_set1: string;
    placar_set2: string;
    placar_set3: string | null;
    is_wo: boolean;
  };
}

interface PlayerStatsModalProps {
  playerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerStatsModal({ playerId, isOpen, onClose }: PlayerStatsModalProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [lastGames, setLastGames] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerData();
    } else {
      setPlayer(null);
      setLastGames([]);
    }
  }, [isOpen, playerId]);

  const fetchPlayerData = async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      // Fetch player profile
      const { data: profile, error: profileError } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', playerId)
        .single();

      if (profileError) throw profileError;
      setPlayer(profile);

      // Fetch last games
      const { data: games, error: gamesError } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          status,
          categoria_evento,
          jogador1:jogador1_id(id, nome, avatar_url),
          jogador2:jogador2_id(id, nome, avatar_url),
          resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
        `)
        .or(`jogador1_id.eq.${playerId},jogador2_id.eq.${playerId}`)
        .eq('status', 'realizado')
        .order('data_jogo', { ascending: false })
        .limit(10);

      if (gamesError) throw gamesError;
      if (games) {
        setLastGames(games as any[]);
      }
    } catch (err) {
      console.error('Error fetching player data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden flex items-center justify-center">
                  {player?.avatar_url ? (
                    <img 
                      src={player.avatar_url} 
                      alt={player.nome} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0F172A] uppercase italic tracking-tighter leading-none mb-1">
                    {player?.nome || 'Carregando...'}
                  </h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {player?.categoria || '...'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-red-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              {loading && !player ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</p>
                </div>
              ) : player ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-emerald-50 p-4 rounded-3xl text-center border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Vitórias</p>
                      <p className="text-2xl font-black text-emerald-700">{player.vitorias}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-3xl text-center border border-red-100">
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Derrotas</p>
                      <p className="text-2xl font-black text-red-700">{player.derrotas}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-3xl text-center border border-blue-100">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Games V.</p>
                      <p className="text-2xl font-black text-blue-700">{player.games_ganhos}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-3xl text-center border border-orange-100">
                      <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Games P.</p>
                      <p className="text-2xl font-black text-orange-700">{player.games_perdidos}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 bg-slate-900 p-4 rounded-3xl text-center shadow-lg shadow-slate-200">
                      <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Taxa</p>
                      <p className="text-2xl font-black text-white">{player.taxa_vitoria}%</p>
                    </div>
                  </div>

                  {/* History Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-slate-400" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Últimos 10 Jogos</h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico Recente</span>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                    ) : lastGames.length > 0 ? (
                      <div className="space-y-3">
                        {lastGames.map((jogo) => {
                          const isJ1 = jogo.jogador1.id === player.id;
                          const opponent = isJ1 ? jogo.jogador2 : jogo.jogador1;
                          const isWinner = jogo.resultado?.vencedor_id === player.id;
                          const isWO = jogo.resultado?.is_wo;

                          return (
                            <div 
                              key={jogo.id}
                              className={cn(
                                "p-4 rounded-2xl border transition-all flex items-center justify-between",
                                isWinner 
                                  ? "bg-emerald-50/50 border-emerald-100" 
                                  : "bg-red-50/50 border-red-100"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm",
                                  isWinner ? "bg-emerald-500" : "bg-red-500"
                                )}>
                                  {isWinner ? 'V' : 'D'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">vs {opponent.nome}</span>
                                    {isWO && <span className="text-[8px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">WO</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {format(new Date(jogo.data_jogo), "dd 'de' MMMM", { locale: ptBR })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className={cn(
                                    "text-sm font-black tracking-tighter",
                                    isWinner ? "text-emerald-600" : "text-red-600"
                                  )}>
                                    {jogo.resultado?.placar_set1}
                                  </span>
                                  <span className={cn(
                                    "text-sm font-black tracking-tighter",
                                    isWinner ? "text-emerald-600" : "text-red-600"
                                  )}>
                                    {jogo.resultado?.placar_set2}
                                  </span>
                                  {jogo.resultado?.placar_set3 && (
                                    <span className={cn(
                                      "text-sm font-black tracking-tighter",
                                      isWinner ? "text-emerald-600" : "text-red-600"
                                    )}>
                                      {jogo.resultado?.placar_set3}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{jogo.categoria_evento}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 font-medium italic">Nenhum jogo realizado encontrado.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-400 italic">Jogador não encontrado.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-[#0F172A] text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
              >
                Fechar Detalhes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function HistoryIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
