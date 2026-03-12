import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Search, Filter, Crown, Medal, TrendingUp, User, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerStatsModal } from '../components/PlayerStatsModal';

interface Player {
  id: string;
  nome: string;
  email: string;
  categoria: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
  jogos_totais: number;
  jogos_realizados: number;
  games_ganhos: number;
  games_perdidos: number;
  saldo_games: number;
  taxa_vitoria: number;
  avatar_url: string | null;
  ativo?: boolean;
  nivel_acesso?: string;
}

const CATEGORIES = ['Grand Slam', 'ATP 1000', 'ATP 500', 'ATP 250', 'Challenger'];

const RANKING_LEGEND = [
  { sigla: 'V', nome: 'Vitórias', desc: 'Número total de partidas vencidas' },
  { sigla: 'D', nome: 'Derrotas', desc: 'Número total de partidas perdidas' },
  { sigla: 'TJ', nome: 'Total de Jogos', desc: 'Total de jogos planejados para a temporada' },
  { sigla: 'TJR', nome: 'Jogos Realizados', desc: 'Total de jogos que já foram disputados' },
  { sigla: 'GG', nome: 'Games Ganhos', desc: 'Soma de todos os games vencidos nos sets' },
  { sigla: 'GP', nome: 'Games Perdidos', desc: 'Soma de todos os games perdidos nos sets' },
  { sigla: 'SG', nome: 'Saldo de Games', desc: 'Diferença entre Games Ganhos e Games Perdidos' },
  { sigla: 'TAXA', nome: 'Taxa de Vitória', desc: 'Porcentagem de aproveitamento (Vitórias / Jogos Realizados)' },
];

export function RankingPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedPlayerIdForStats, setSelectedPlayerIdForStats] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, email, categoria, pontos, vitorias, derrotas, jogos_totais, jogos_realizados, games_ganhos, games_perdidos, saldo_games, taxa_vitoria, avatar_url, nivel_acesso, ativo')
        .order('pontos', { ascending: false })
        .order('vitorias', { ascending: false })
        .order('saldo_games', { ascending: false });

      if (error) throw error;

      if (data) {
        setPlayers(data as Player[]);
      }
    } catch (err) {
      console.error('Error fetching ranking:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const filteredPlayers = useMemo(() => {
    const searchLower = search.toLowerCase();
    return players.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchLower) || p.email.toLowerCase().includes(searchLower);
      const matchesCategory = !category || p.categoria === category;
      const isAtivo = p.ativo !== false;
      const nivel = p.nivel_acesso?.toUpperCase();
      const isNotMaster = nivel !== 'ADMIN_MASTER' && p.nome !== 'DJOKO MASTER';
      return matchesSearch && matchesCategory && isAtivo && isNotMaster;
    });
  }, [players, search, category]);

  const podium = useMemo(() => filteredPlayers.slice(0, 3), [filteredPlayers]);

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerIdForStats(playerId);
    setIsStatsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
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
      <div className="relative bg-[#0F172A] rounded-[32px] md:rounded-[40px] p-4 md:p-8 mb-4 md:mb-6 text-center overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1595435066359-62f32ff9d51d?q=80&w=1920&auto=format&fit=crop" 
            alt="Tennis Court" 
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/60 to-[#0F172A]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center group cursor-pointer mb-3 md:mb-4">
            <div className="relative pr-4">
              <span className="text-4xl md:text-6xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-2xl">
                ATP
              </span>
              <div className="absolute top-1/2 left-0 w-[calc(100%-1rem)] h-[2px] md:h-[3px] bg-white -rotate-12 transform -translate-y-1/2 opacity-40"></div>
            </div>
            <div className="mt-1 flex flex-col items-center">
              <span className="text-sm md:text-lg font-black tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                FARIA LIMER
              </span>
            </div>
          </div>
          <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-white mb-1 italic tracking-tight uppercase">
            RANKING FARIA LIMER <span className="text-yellow-500">|</span> QUINTA
          </h1>
          <p className="text-slate-300 text-[10px] md:text-base font-medium tracking-wide">
            Onde os campeões se encontram toda quinta-feira!
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start order-2 md:order-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? null : cat)}
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95",
                category === cat 
                  ? "bg-blue-600 text-white shadow-blue-200" 
                  : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64 order-1 md:order-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Legend Section */}
      <div className="mb-6 flex flex-wrap gap-2 md:gap-4 justify-center">
        {RANKING_LEGEND.map((item) => (
          <div 
            key={item.sigla}
            className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm"
            title={item.desc}
          >
            <span className="text-[10px] font-black text-blue-600">{item.sigla}:</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item.nome}</span>
          </div>
        ))}
      </div>

      {/* Ranking Table */}
      <div className="space-y-12">
        {CATEGORIES.filter(cat => !category || cat === category).map((cat) => {
          const playersInCat = filteredPlayers
            .filter(p => p.categoria === cat)
            .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo_games - a.saldo_games);

          if (playersInCat.length === 0) return null;

          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                    {cat}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Classificação da Categoria
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Pos.</th>
                        <th className="px-6 py-4">Jogador</th>
                        <th className="px-6 py-4 text-center">Pontos</th>
                        {RANKING_LEGEND.map((item) => (
                          <th 
                            key={item.sigla}
                            className={cn(
                              "px-4 py-4 text-center cursor-help transition-colors relative group",
                              activeTooltip === item.sigla ? "text-blue-600" : "hover:text-slate-600"
                            )}
                            onClick={() => setActiveTooltip(activeTooltip === item.sigla ? null : item.sigla)}
                          >
                            <div className="flex flex-col items-center">
                              <span>{item.sigla}</span>
                              <AnimatePresence>
                                {activeTooltip === item.sigla && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 p-2 bg-[#0F172A] text-white rounded-lg text-[9px] font-bold normal-case tracking-normal shadow-xl z-50"
                                  >
                                    <p className="text-blue-400 mb-1 uppercase tracking-widest">{item.nome}</p>
                                    <p className="font-medium text-slate-300 leading-tight">{item.desc}</p>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#0F172A]"></div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {playersInCat.map((player, index) => (
                        <tr key={player.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                              {index === 1 && <Medal className="w-4 h-4 text-slate-400" />}
                              {index === 2 && <Medal className="w-4 h-4 text-orange-400" />}
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black",
                                index === 0 ? "bg-yellow-500 text-white" :
                                index === 1 ? "bg-slate-400 text-white" :
                                index === 2 ? "bg-orange-400 text-white" :
                                "bg-emerald-100 text-emerald-600"
                              )}>
                                {index + 1}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div 
                              className="flex items-center gap-3 group cursor-pointer"
                              onClick={() => handlePlayerClick(player.id)}
                            >
                              <div 
                                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border-2 border-slate-100 overflow-hidden transition-transform duration-300 hover:scale-125 hover:z-10 hover:shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/jogadores?id=${player.id}`);
                                }}
                              >
                                {player.avatar_url ? (
                                  <img 
                                    src={player.avatar_url} 
                                    alt={player.nome} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-slate-300" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">{player.nome}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                              <span className="text-sm font-black text-slate-900">{player.pontos}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                {player.vitorias}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                                {player.derrotas}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-xs font-bold text-slate-500">{player.jogos_totais}</td>
                          <td className="px-4 py-4 text-center text-xs font-bold text-slate-500">{player.jogos_realizados}</td>
                          <td className="px-4 py-4 text-center text-xs font-bold text-blue-600">{player.games_ganhos}</td>
                          <td className="px-4 py-4 text-center text-xs font-bold text-orange-600">{player.games_perdidos}</td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                              <span className={cn(
                                "text-xs font-black",
                                player.saldo_games > 0 ? "text-emerald-500" : 
                                player.saldo_games < 0 ? "text-red-500" : "text-slate-400"
                              )}>
                                {player.saldo_games > 0 ? `+${player.saldo_games}` : player.saldo_games}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">
                            {player.taxa_vitoria}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50">
                  {playersInCat.map((player, index) => (
                    <div key={player.id} className="p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 group cursor-pointer"
                          onClick={() => handlePlayerClick(player.id)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                            index === 0 ? "bg-yellow-500 text-white" :
                            index === 1 ? "bg-slate-400 text-white" :
                            index === 2 ? "bg-orange-400 text-white" :
                            "bg-emerald-100 text-emerald-600"
                          )}>
                            {index + 1}
                          </div>
                          <div 
                            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border-2 border-slate-100 overflow-hidden transition-transform duration-300 hover:scale-125 hover:z-10 hover:shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jogadores?id=${player.id}`);
                            }}
                          >
                            {player.avatar_url ? (
                              <img 
                                src={player.avatar_url} 
                                alt={player.nome} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{player.nome}</p>
                            <p className="text-[10px] text-slate-400">{player.categoria}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            <span className="text-sm font-black text-slate-900">{player.pontos} pts</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{player.taxa_vitoria}% Win Rate</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">V / D</p>
                          <p className="text-[10px] font-bold text-slate-700">{player.vitorias} / {player.derrotas}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Jogos</p>
                          <p className="text-[10px] font-bold text-slate-700">{player.jogos_realizados}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Games</p>
                          <p className="text-[10px] font-bold text-slate-700">{player.games_ganhos}/{player.games_perdidos}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Saldo</p>
                          <p className={cn(
                            "text-[10px] font-black",
                            player.saldo_games > 0 ? "text-emerald-500" : 
                            player.saldo_games < 0 ? "text-red-500" : "text-slate-400"
                          )}>
                            {player.saldo_games > 0 ? `+${player.saldo_games}` : player.saldo_games}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="bg-white rounded-[32px] p-20 text-center border border-slate-100 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {!loading && filteredPlayers.length === 0 && (
          <div className="bg-white rounded-[32px] p-20 text-center border border-slate-100 shadow-sm">
            <p className="text-slate-400 italic">Nenhum jogador encontrado.</p>
          </div>
        )}
      </div>

      <PlayerStatsModal 
        playerId={selectedPlayerIdForStats}
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />
    </div>
  );
}
