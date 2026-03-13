import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Users, Search, ChevronRight, User, ArrowRightLeft, Calendar, MapPin, CheckCircle2, TrendingUp, Medal, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlayerStatsModal } from '../components/PlayerStatsModal';

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
  nivel_acesso?: string;
}

interface Jogo {
  id: string;
  data_jogo: string;
  categoria_evento: string;
  jogador1_id: string;
  jogador2_id: string;
  status: string;
  resultado: {
    vencedor_id: string;
    placar_set1: string;
    placar_set2: string;
    placar_set3: string | null;
    is_wo: boolean;
  } | null;
}

interface PlayerStats {
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  winRate: number;
  bestStreak: number;
}

export function H2HPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [player1Id, setPlayer1Id] = useState<string>('');
  const [player2Id, setPlayer2Id] = useState<string>('');
  const [pastMatches, setPastMatches] = useState<Jogo[]>([]);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [statsType, setStatsType] = useState<'career' | 'ytd'>('career');
  const [p1AllMatches, setP1AllMatches] = useState<Jogo[]>([]);
  const [p2AllMatches, setP2AllMatches] = useState<Jogo[]>([]);
  const [fetchingAllMatches, setFetchingAllMatches] = useState(false);

  // Player Stats Modal State
  const [selectedPlayerIdForStats, setSelectedPlayerIdForStats] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Search states
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);

  // Handle incoming state from other pages (like JogosPage)
  useEffect(() => {
    if (location.state?.p1 && location.state?.p2) {
      setPlayer1Id(location.state.p1);
      setPlayer2Id(location.state.p2);
      // Clear state to avoid re-triggering on refresh if desired, 
      // but usually keeping it is fine for the session.
    }
  }, [location.state]);

  const filteredPlayers1 = useMemo(() => {
    const searchLower = search1.toLowerCase();
    return players.filter(p => 
      p.id !== player2Id && 
      p.ativo !== false &&
      p.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
      p.nome !== 'DJOKO MASTER' &&
      (search1 === '' || p.nome.toLowerCase().includes(searchLower))
    ).slice(0, 5);
  }, [players, search1, player2Id]);

  const filteredPlayers2 = useMemo(() => {
    const searchLower = search2.toLowerCase();
    return players.filter(p => 
      p.id !== player1Id && 
      p.ativo !== false &&
      p.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
      p.nome !== 'DJOKO MASTER' &&
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
    setFetchingAllMatches(true);
    try {
      // Fetch H2H matches
      const { data: h2hData, error: h2hError } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          categoria_evento,
          jogador1_id,
          jogador2_id,
          status,
          resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
        `)
        .or(`and(jogador1_id.eq.${player1Id},jogador2_id.eq.${player2Id}),and(jogador1_id.eq.${player2Id},jogador2_id.eq.${player1Id})`)
        .eq('status', 'realizado')
        .order('data_jogo', { ascending: false });

      if (h2hError) throw h2hError;
      if (h2hData) setPastMatches(h2hData as any);

      // Fetch all matches for P1
      const { data: p1Data, error: p1Error } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          categoria_evento,
          jogador1_id,
          jogador2_id,
          status,
          resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
        `)
        .or(`jogador1_id.eq.${player1Id},jogador2_id.eq.${player1Id}`)
        .eq('status', 'realizado')
        .order('data_jogo', { ascending: true });

      if (p1Error) throw p1Error;
      if (p1Data) setP1AllMatches(p1Data as any);

      // Fetch all matches for P2
      const { data: p2Data, error: p2Error } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          categoria_evento,
          jogador1_id,
          jogador2_id,
          status,
          resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
        `)
        .or(`jogador1_id.eq.${player2Id},jogador2_id.eq.${player2Id}`)
        .eq('status', 'realizado')
        .order('data_jogo', { ascending: true });

      if (p2Error) throw p2Error;
      if (p2Data) setP2AllMatches(p2Data as any);

    } catch (err) {
      console.error('Error fetching H2H matches:', err);
    } finally {
      setFetchingMatches(false);
      setFetchingAllMatches(false);
    }
  }, [player1Id, player2Id]);

  const calculateStats = useCallback((playerId: string, matches: Jogo[], type: 'career' | 'ytd'): PlayerStats => {
    const currentYear = new Date().getFullYear();
    const filteredMatches = type === 'career' 
      ? matches 
      : matches.filter(m => new Date(m.data_jogo).getFullYear() === currentYear);

    let wins = 0;
    let losses = 0;
    let setsWon = 0;
    let setsLost = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    // Sort matches by date ascending for streak calculation
    const sortedMatches = [...filteredMatches].sort((a, b) => 
      new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime()
    );

    sortedMatches.forEach(m => {
      if (!m.resultado) return;

      const isWinner = m.resultado.vencedor_id === playerId;
      if (isWinner) {
        wins++;
        currentStreak++;
        if (currentStreak > bestStreak) bestStreak = currentStreak;
      } else {
        losses++;
        currentStreak = 0;
      }

      if (!m.resultado.is_wo) {
        const isP1 = m.jogador1_id === playerId;
        const scores = [m.resultado.placar_set1, m.resultado.placar_set2, m.resultado.placar_set3].filter(Boolean);
        
        scores.forEach(s => {
          const parts = s!.split('(')[0].split('/');
          const p1Score = parseInt(parts[0]);
          const p2Score = parseInt(parts[1]);
          
          if (isP1) {
            if (p1Score > p2Score) setsWon++;
            else if (p2Score > p1Score) setsLost++;
          } else {
            if (p2Score > p1Score) setsWon++;
            else if (p1Score > p2Score) setsLost++;
          }
        });
      }
    });

    const played = wins + losses;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

    return { played, wins, losses, setsWon, setsLost, winRate, bestStreak };
  }, []);

  const p1H2HStats = useMemo(() => player1Id ? calculateStats(player1Id, pastMatches, statsType) : null, [player1Id, pastMatches, statsType, calculateStats]);
  const p2H2HStats = useMemo(() => player2Id ? calculateStats(player2Id, pastMatches, statsType) : null, [player2Id, pastMatches, statsType, calculateStats]);
  
  const p1CareerTotal = useMemo(() => player1Id ? calculateStats(player1Id, p1AllMatches, 'career') : null, [player1Id, p1AllMatches, calculateStats]);
  const p2CareerTotal = useMemo(() => player2Id ? calculateStats(player2Id, p2AllMatches, 'career') : null, [player2Id, p2AllMatches, calculateStats]);

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
          <div className="space-y-12">            {/* H2H Scoreboard */}
            <div className="flex flex-col lg:flex-row items-stretch gap-8">
              {/* Player 1 Card */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 relative group"
              >
                <div className="aspect-[3/4] rounded-[40px] overflow-hidden bg-slate-200 relative shadow-2xl">
                  <img 
                    src={p1.avatar_url || `https://ui-avatars.com/api/?name=${p1.nome}`} 
                    alt={p1.nome} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-transparent to-transparent"></div>
                  
                  {/* Name Box */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-3xl p-6 shadow-2xl transform group-hover:-translate-y-2 transition-transform duration-500">
                    <h2 className="text-2xl md:text-3xl font-black text-[#0F172A] uppercase italic tracking-tighter text-center">
                      {p1.nome}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-4 h-3 object-cover rounded-sm" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BRA</span>
                    </div>
                    <button 
                      onClick={swapPlayers}
                      className="w-full mt-4 py-2 bg-[#0F172A] text-white rounded-xl text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-yellow-500 hover:text-[#0F172A] transition-all"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      Swap Player
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Stats Box */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-[1.5] bg-[#0F172A] rounded-[40px] shadow-2xl border border-white/5 overflow-hidden flex flex-col"
              >
                <div className="p-8 md:p-12 border-b border-white/5 bg-white/5 flex-1">
                  <div className="flex flex-col items-center gap-8 h-full justify-center">
                    {/* Toggle Button */}
                    <div className="bg-white/10 p-1 rounded-full flex items-center">
                      <button 
                        onClick={() => setStatsType('career')}
                        className={cn(
                          "px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all",
                          statsType === 'career' ? "bg-yellow-500 text-[#0F172A] shadow-lg" : "text-white/60 hover:text-white"
                        )}
                      >
                        Career
                      </button>
                      <button 
                        onClick={() => setStatsType('ytd')}
                        className={cn(
                          "px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all",
                          statsType === 'ytd' ? "bg-yellow-500 text-[#0F172A] shadow-lg" : "text-white/60 hover:text-white"
                        )}
                      >
                        YTD 2026
                      </button>
                    </div>

                    {/* Circular Comparison */}
                    <div className="grid grid-cols-3 items-center gap-4 md:gap-12 w-full">
                      <div className="text-center md:text-right">
                        <div className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">
                          {fetchingMatches ? '...' : p1H2HStats?.wins}
                        </div>
                        <div className="text-xs md:text-sm font-black text-yellow-500 uppercase tracking-widest mt-1">
                          {fetchingMatches ? '...' : `${p1H2HStats?.winRate}% Win`}
                        </div>
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
                          {fetchingMatches ? '...' : `${p1H2HStats?.wins}/${p1H2HStats?.losses}`}
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 relative">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="45%"
                              className="stroke-white/10 fill-none"
                              strokeWidth="8"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="45%"
                              className="stroke-emerald-500 fill-none transition-all duration-1000"
                              strokeWidth="8"
                              strokeDasharray="283"
                              strokeDashoffset={283 - (283 * (p1H2HStats?.winRate || 0)) / 100}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl md:text-4xl font-black text-white italic">
                              {fetchingMatches ? '...' : p1H2HStats?.played}
                            </span>
                            <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Played</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center md:text-left">
                        <div className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">
                          {fetchingMatches ? '...' : p2H2HStats?.wins}
                        </div>
                        <div className="text-xs md:text-sm font-black text-yellow-500 uppercase tracking-widest mt-1">
                          {fetchingMatches ? '...' : `${p2H2HStats?.winRate}% Win`}
                        </div>
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
                          {fetchingMatches ? '...' : `${p2H2HStats?.wins}/${p2H2HStats?.losses}`}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter text-center">
                      {statsType === 'career' ? 'Career Stats' : 'YTD 2026 Stats'}
                    </h3>
                  </div>
                </div>
                
                <div className="p-8 md:p-12 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="space-y-8">
                    <StatRow label="Matches Played" v1={p1H2HStats?.played} v2={p2H2HStats?.played} dark />
                    <StatRow label="Wins" v1={p1H2HStats?.wins} v2={p2H2HStats?.wins} dark />
                    <StatRow label="Losses" v1={p1H2HStats?.losses} v2={p2H2HStats?.losses} dark />
                    <StatRow label="Sets Won" v1={p1H2HStats?.setsWon} v2={p2H2HStats?.setsWon} dark />
                    <StatRow label="Sets Lost" v1={p1H2HStats?.setsLost} v2={p2H2HStats?.setsLost} dark />
                    <StatRow label="Win Rate" v1={`${p1H2HStats?.winRate}%`} v2={`${p2H2HStats?.winRate}%`} dark />
                    <StatRow label="Best Streak" v1={p1H2HStats?.bestStreak} v2={p2H2HStats?.bestStreak} dark />
                    <StatRow label="Career W/L" v1={fetchingAllMatches ? '...' : `${p1CareerTotal?.wins}/${p1CareerTotal?.losses}`} v2={fetchingAllMatches ? '...' : `${p2CareerTotal?.wins}/${p2CareerTotal?.losses}`} dark />
                  </div>
                </div>
              </motion.div>

              {/* Player 2 Card */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 relative group"
              >
                <div className="aspect-[3/4] rounded-[40px] overflow-hidden bg-slate-200 relative shadow-2xl">
                  <img 
                    src={p2.avatar_url || `https://ui-avatars.com/api/?name=${p2.nome}`} 
                    alt={p2.nome} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-transparent to-transparent"></div>
                  
                  {/* Name Box */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-3xl p-6 shadow-2xl transform group-hover:-translate-y-2 transition-transform duration-500">
                    <h2 className="text-2xl md:text-3xl font-black text-[#0F172A] uppercase italic tracking-tighter text-center">
                      {p2.nome}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-4 h-3 object-cover rounded-sm" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BRA</span>
                    </div>
                    <button 
                      onClick={swapPlayers}
                      className="w-full mt-4 py-2 bg-[#0F172A] text-white rounded-xl text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-yellow-500 hover:text-[#0F172A] transition-all"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      Swap Player
                    </button>
                  </div>
                </div>
              </motion.div>
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
                          <div className="bg-[#0F172A] text-white px-3 py-1 rounded-full shadow-lg shadow-slate-900/10 flex items-center gap-2">
                            <Trophy className="w-3 h-3 text-yellow-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              {match.categoria_evento || 'Tournament'}
                            </span>
                          </div>
                          <div>
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

      <PlayerStatsModal 
        playerId={selectedPlayerIdForStats}
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />
    </div>
  );
}

function StatRow({ label, v1, v2, dark }: { label: string, v1: any, v2: any, dark?: boolean }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between py-2 relative z-10">
        <div className={cn(
          "w-1/3 text-2xl md:text-4xl font-black italic tracking-tighter",
          dark ? "text-white" : "text-[#0F172A]"
        )}>{v1}</div>
        <div className="w-1/3 text-center text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{label}</div>
        <div className={cn(
          "w-1/3 text-right text-2xl md:text-4xl font-black italic tracking-tighter",
          dark ? "text-white" : "text-[#0F172A]"
        )}>{v2}</div>
      </div>
      <div className={cn(
        "absolute bottom-0 left-0 w-full h-px",
        dark ? "bg-white/5" : "bg-slate-100"
      )}></div>
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
