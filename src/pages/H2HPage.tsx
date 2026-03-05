import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Users, Search, ChevronRight, User, ArrowRightLeft, Calendar, MapPin, CheckCircle2, TrendingUp, Medal, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Player {
  id: string;
  nome: string;
  avatar_url: string | null;
  categoria: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
  jogos_realizados: number;
  taxa_vitoria: number;
  games_ganhos: number;
  games_perdidos: number;
  saldo_games: number;
  ativo?: boolean;
}

interface Jogo {
  id: string;
  data_jogo: string;
  categoria_evento: string;
  jogador1_id: string;
  jogador2_id: string;
  resultado: {
    vencedor_id: string;
    placar_set1: string;
    placar_set2: string;
    placar_set3: string | null;
    is_wo: boolean;
  } | null;
}

export function H2HPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [player1Id, setPlayer1Id] = useState<string>('');
  const [player2Id, setPlayer2Id] = useState<string>('');
  const [pastMatches, setPastMatches] = useState<Jogo[]>([]);
  const [fetchingMatches, setFetchingMatches] = useState(false);

  // Search states
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);

  const filteredPlayers1 = useMemo(() => {
    const searchLower = search1.toLowerCase();
    return players.filter(p => 
      p.id !== player2Id && 
      p.ativo !== false &&
      (search1 === '' || p.nome.toLowerCase().includes(searchLower))
    ).slice(0, 5);
  }, [players, search1, player2Id]);

  const filteredPlayers2 = useMemo(() => {
    const searchLower = search2.toLowerCase();
    return players.filter(p => 
      p.id !== player1Id && 
      p.ativo !== false &&
      (search2 === '' || p.nome.toLowerCase().includes(searchLower))
    ).slice(0, 5);
  }, [players, search2, player1Id]);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      if (data) setPlayers(data as Player[]);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Sync search inputs with selected players
  useEffect(() => {
    const p1 = players.find(p => p.id === player1Id);
    if (p1) setSearch1(p1.nome);
  }, [player1Id, players]);

  useEffect(() => {
    const p2 = players.find(p => p.id === player2Id);
    if (p2) setSearch2(p2.nome);
  }, [player2Id, players]);

  const fetchH2HData = useCallback(async () => {
    if (!player1Id || !player2Id) return;
    setFetchingMatches(true);
    try {
      const { data, error } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          categoria_evento,
          jogador1_id,
          jogador2_id,
          resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
        `)
        .or(`and(jogador1_id.eq.${player1Id},jogador2_id.eq.${player2Id}),and(jogador1_id.eq.${player2Id},jogador2_id.eq.${player1Id})`)
        .eq('status', 'realizado')
        .order('data_jogo', { ascending: false });

      if (error) throw error;
      if (data) setPastMatches(data as any);
    } catch (err) {
      console.error('Error fetching H2H matches:', err);
    } finally {
      setFetchingMatches(false);
    }
  }, [player1Id, player2Id]);

  useEffect(() => {
    fetchH2HData();
  }, [fetchH2HData]);

  const p1 = useMemo(() => players.find(p => p.id === player1Id), [players, player1Id]);
  const p2 = useMemo(() => players.find(p => p.id === player2Id), [players, player2Id]);

  const h2hStats = useMemo(() => {
    if (!p1 || !p2) return null;
    const p1Wins = pastMatches.filter(m => m.resultado?.vencedor_id === p1.id).length;
    const p2Wins = pastMatches.filter(m => m.resultado?.vencedor_id === p2.id).length;
    return { p1Wins, p2Wins, total: pastMatches.length };
  }, [p1, p2, pastMatches]);

  const swapPlayers = () => {
    const tempId = player1Id;
    const tempSearch = search1;
    setPlayer1Id(player2Id);
    setSearch1(search2);
    setPlayer2Id(tempId);
    setSearch2(tempSearch);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Back to Home button */}
      <div className="flex justify-end p-4 lg:hidden">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
        >
          <LayoutDashboard className="w-3 h-3" />
          Início
        </button>
      </div>

      {/* ATP Style Hero Section */}
      <div className="relative bg-[#0F172A] rounded-b-[40px] md:rounded-b-[60px] p-6 md:p-12 mb-8 md:mb-10 text-center shadow-2xl border-b border-white/5 z-20">
        <div className="absolute inset-0 z-0 overflow-hidden rounded-b-[40px] md:rounded-b-[60px]">
          <img 
            src="https://images.unsplash.com/photo-1595435066359-62f32ff9d51d?q=80&w=1920&auto=format&fit=crop" 
            alt="Tennis Court" 
            className="w-full h-full object-cover opacity-10"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/60 to-[#0F172A]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col items-center group cursor-pointer mb-6">
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
          
          <h1 className="text-3xl md:text-6xl font-black text-white mb-8 italic tracking-tighter uppercase">
            HEAD TO <span className="text-yellow-500">HEAD</span>
          </h1>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {/* Player 1 Searchable Input */}
            <div className="w-full max-w-sm relative">
              <div className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-2xl border-b-4 md:border-b-8 border-yellow-500">
                <input 
                  type="text"
                  placeholder="Digite o nome do tenista 1"
                  value={search1}
                  onChange={(e) => {
                    setSearch1(e.target.value);
                    setShowResults1(true);
                  }}
                  onFocus={() => {
                    setSearch1('');
                    setShowResults1(true);
                  }}
                  onBlur={() => setTimeout(() => setShowResults1(false), 200)}
                  className="w-full bg-transparent text-lg md:text-2xl font-black text-[#0F172A] uppercase text-center outline-none placeholder:text-slate-200"
                />
                <AnimatePresence>
                  {showResults1 && filteredPlayers1.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                    >
                      {filteredPlayers1.map(p => (
                        <button
                          key={p.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPlayer1Id(p.id);
                            setSearch1(p.nome);
                            setShowResults1(false);
                          }}
                          className="w-full px-6 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100">
                            <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.nome}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-black text-[#0F172A] uppercase">{p.nome}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-2 flex items-center justify-center gap-2 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Search className="w-2.5 h-2.5" />
                  Buscar Tenista
                </div>
              </div>
            </div>

            <button 
              onClick={swapPlayers}
              className="w-10 h-10 md:w-14 md:h-14 bg-yellow-500 text-[#0F172A] rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all active:scale-95 z-10"
            >
              <ArrowRightLeft className="w-5 h-5 md:w-7 md:h-7" />
            </button>

            {/* Player 2 Searchable Input */}
            <div className="w-full max-w-sm relative">
              <div className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-2xl border-b-4 md:border-b-8 border-yellow-500">
                <input 
                  type="text"
                  placeholder="Digite o nome do tenista 2"
                  value={search2}
                  onChange={(e) => {
                    setSearch2(e.target.value);
                    setShowResults2(true);
                  }}
                  onFocus={() => {
                    setSearch2('');
                    setShowResults2(true);
                  }}
                  onBlur={() => setTimeout(() => setShowResults2(false), 200)}
                  className="w-full bg-transparent text-lg md:text-2xl font-black text-[#0F172A] uppercase text-center outline-none placeholder:text-slate-200"
                />
                <AnimatePresence>
                  {showResults2 && filteredPlayers2.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                    >
                      {filteredPlayers2.map(p => (
                        <button
                          key={p.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPlayer2Id(p.id);
                            setSearch2(p.nome);
                            setShowResults2(false);
                          }}
                          className="w-full px-6 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100">
                            <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.nome}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-black text-[#0F172A] uppercase">{p.nome}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-2 flex items-center justify-center gap-2 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Search className="w-2.5 h-2.5" />
                  Buscar Tenista
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 pb-20">
        {p1 && p2 ? (
          <div className="space-y-12">
            {/* H2H Scoreboard */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0F172A] rounded-[40px] p-8 md:p-12 shadow-2xl text-white overflow-hidden relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/10 hidden md:block"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 relative z-10">
                <div className="text-center md:text-right">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-yellow-500 overflow-hidden mx-auto md:ml-auto md:mr-0 mb-4 shadow-2xl">
                    <img src={p1.avatar_url || `https://ui-avatars.com/api/?name=${p1.nome}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">{p1.nome}</h2>
                  <p className="text-yellow-500 font-black text-sm uppercase tracking-widest mt-2">{p1.categoria}</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center gap-4 mb-4">
                    <span className="text-6xl md:text-8xl font-black italic tracking-tighter text-yellow-500">{h2hStats?.p1Wins}</span>
                    <span className="text-2xl md:text-4xl font-black text-white/20 italic">VS</span>
                    <span className="text-6xl md:text-8xl font-black italic tracking-tighter text-yellow-500">{h2hStats?.p2Wins}</span>
                  </div>
                  <div className="bg-white/10 rounded-full px-6 py-2 inline-block">
                    <span className="text-xs font-black uppercase tracking-[0.3em]">{h2hStats?.total} MATCHES PLAYED</span>
                  </div>
                </div>

                <div className="text-center md:text-left">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-yellow-500 overflow-hidden mx-auto md:mr-auto md:ml-0 mb-4 shadow-2xl">
                    <img src={p2.avatar_url || `https://ui-avatars.com/api/?name=${p2.nome}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">{p2.nome}</h2>
                  <p className="text-yellow-500 font-black text-sm uppercase tracking-widest mt-2">{p2.categoria}</p>
                </div>
              </div>
            </motion.div>

            {/* Career Stats Comparison */}
            <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-8 md:p-12 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] uppercase italic tracking-tighter text-center">Career Stats</h3>
              </div>
              <div className="p-4 md:p-12">
                <div className="space-y-8">
                  <StatRow label="Ranking Points" v1={p1.pontos} v2={p2.pontos} />
                  <StatRow label="Win Rate" v1={`${p1.taxa_vitoria}%`} v2={`${p2.taxa_vitoria}%`} />
                  <StatRow label="Matches Played" v1={p1.jogos_realizados} v2={p2.jogos_realizados} />
                  <StatRow label="Career Wins" v1={p1.vitorias} v2={p2.vitorias} />
                  <StatRow label="Games Won" v1={p1.games_ganhos} v2={p2.games_ganhos} />
                  <StatRow label="Game Balance" v1={p1.saldo_games} v2={p2.saldo_games} />
                </div>
              </div>
            </div>

            {/* Player Profiles */}
            <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-8 md:p-12 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] uppercase italic tracking-tighter text-center">Player Profiles</h3>
              </div>
              <div className="p-4 md:p-12">
                <div className="space-y-8">
                  <StatRow label="Category" v1={p1.categoria} v2={p2.categoria} />
                  <StatRow label="Status" v1="Active" v2="Active" />
                  <StatRow label="Plays" v1="Right-Handed" v2="Right-Handed" />
                  <StatRow label="Country" v1="Brazil" v2="Brazil" />
                </div>
              </div>
            </div>

            {/* Past Meets */}
            <div className="space-y-8">
              <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] uppercase italic tracking-tighter text-center">Past Meets</h3>
              {fetchingMatches ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F172A]"></div>
                </div>
              ) : pastMatches.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
                  <p className="text-slate-400 font-bold uppercase tracking-widest">No past matches found between these players.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pastMatches.map((match) => (
                    <motion.div 
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-[32px] p-6 md:p-10 shadow-lg border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center text-yellow-500">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#0F172A] uppercase tracking-tighter">{match.categoria_evento}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(match.data_jogo), "MMMM yyyy", { locale: ptBR })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                          <MapPin className="w-3 h-3" />
                          Faria Limer Central Court
                        </div>
                      </div>

                      <div className="flex-[2] bg-[#0F172A] rounded-[24px] p-6 md:p-8 text-white w-full">
                        <div className="space-y-4">
                          <MatchPlayerRow 
                            name={p1.nome} 
                            isWinner={match.resultado?.vencedor_id === p1.id} 
                            scores={[
                              match.resultado?.placar_set1,
                              match.resultado?.placar_set2,
                              match.resultado?.placar_set3
                            ].filter(Boolean) as string[]}
                            isP1={match.jogador1_id === p1.id}
                          />
                          <div className="h-px bg-white/10"></div>
                          <MatchPlayerRow 
                            name={p2.nome} 
                            isWinner={match.resultado?.vencedor_id === p2.id} 
                            scores={[
                              match.resultado?.placar_set1,
                              match.resultado?.placar_set2,
                              match.resultado?.placar_set3
                            ].filter(Boolean) as string[]}
                            isP1={match.jogador1_id === p2.id}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] p-12 md:p-20 text-center shadow-2xl border border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Users className="w-12 h-12 text-slate-200" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] uppercase italic tracking-tighter mb-4">Select Players</h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto">Choose two players from the menu above to compare their career statistics and direct match history.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, v1, v2 }: { label: string, v1: any, v2: any }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between py-2 relative z-10">
        <div className="w-1/3 text-2xl md:text-4xl font-black text-[#0F172A] italic tracking-tighter">{v1}</div>
        <div className="w-1/3 text-center text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{label}</div>
        <div className="w-1/3 text-right text-2xl md:text-4xl font-black text-[#0F172A] italic tracking-tighter">{v2}</div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-slate-100"></div>
    </div>
  );
}

function MatchPlayerRow({ name, isWinner, scores, isP1 }: { name: string, isWinner: boolean, scores: string[], isP1: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isWinner ? "bg-yellow-500 shadow-[0_0_10px_#EAB308]" : "bg-transparent"
        )}></div>
        <span className={cn(
          "text-sm md:text-xl font-black uppercase italic tracking-tighter",
          isWinner ? "text-yellow-500" : "text-white/60"
        )}>{name}</span>
      </div>
      <div className="flex gap-4 md:gap-8">
        {scores.map((s, i) => {
          const parts = s.split('(')[0].split('/');
          const score = isP1 ? parts[0] : parts[1];
          const opponentScore = isP1 ? parts[1] : parts[0];
          const wonSet = parseInt(score) > parseInt(opponentScore);
          
          return (
            <div key={i} className="flex flex-col items-center">
              <span className={cn(
                "text-lg md:text-2xl font-black italic",
                wonSet ? "text-white" : "text-white/30"
              )}>{score}</span>
              {s.includes('(') && (
                <span className="text-[8px] font-bold text-white/40 mt-[-4px]">
                  {isP1 ? s.split('(')[1].split('-')[0] : s.split('(')[1].split('-')[1].replace(')', '')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
