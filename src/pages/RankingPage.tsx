import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Search, Filter, Crown, Medal, TrendingUp, User, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cn } from '../utils';
import { motion } from 'motion/react';

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

const CATEGORIES = ['TODOS', 'Grand Slam', 'ATP 1000', 'ATP 500', 'ATP 250', 'Challenger'];

export function RankingPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('TODOS');

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
      const matchesCategory = category === 'TODOS' || p.categoria === category;
      const isAtivo = p.ativo !== false;
      const nivel = p.nivel_acesso?.toUpperCase();
      const isNotMaster = nivel !== 'ADMIN_MASTER' && p.nome !== 'DJOKO MASTER';
      return matchesSearch && matchesCategory && isAtivo && isNotMaster;
    });
  }, [players, search, category]);

  const podium = useMemo(() => filteredPlayers.slice(0, 3), [filteredPlayers]);

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
      <div className="relative bg-[#0F172A] rounded-[32px] md:rounded-[40px] p-6 md:p-10 mb-8 md:mb-10 text-center overflow-hidden shadow-2xl border border-white/5">
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
          <div className="flex flex-col items-center group cursor-pointer mb-4 md:mb-6">
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
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-2 italic tracking-tight uppercase">
            RANKING FARIA LIMER <span className="text-yellow-500">|</span> QUINTA
          </h1>
          <p className="text-slate-300 text-xs md:text-lg font-medium tracking-wide">
            Onde os campeões se encontram toda quinta-feira!
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                category === cat 
                  ? "bg-[#0F172A] text-white shadow-lg" 
                  : "bg-white text-slate-500 border border-slate-100 hover:border-slate-200"
              )}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
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

      {/* Podium */}
      {!search && category === 'TODOS' && podium.length >= 3 && (
        <div className="flex flex-col md:flex-row gap-8 md:gap-4 mb-12 items-center md:items-end max-w-4xl mx-auto">
          {/* 2nd Place */}
          <div className="flex flex-col items-center order-2 md:order-1">
            <div className="relative mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-200 overflow-hidden shadow-xl">
                <img src={podium[1].avatar_url || `https://ui-avatars.com/api/?name=${podium[1].nome}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 bg-slate-200 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Medal className="text-slate-500 w-3 h-3 md:w-4 md:h-4" />
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-center text-xs md:text-sm">{podium[1].nome}</h3>
            <div className="mt-2 bg-slate-100 px-3 py-1 rounded-lg">
              <span className="text-[10px] md:text-xs font-black text-slate-600">{podium[1].pontos} pts</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center order-1 md:order-2 scale-110 md:scale-100">
            <div className="relative mb-6">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-yellow-400 overflow-hidden shadow-2xl md:scale-110">
                <img src={podium[0].avatar_url || `https://ui-avatars.com/api/?name=${podium[0].nome}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -top-4 -right-4 w-8 h-8 md:w-10 md:h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Crown className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <h3 className="font-black text-slate-900 text-center text-base md:text-lg">{podium[0].nome}</h3>
            <div className="mt-2 bg-yellow-400 px-4 py-1.5 rounded-lg shadow-lg shadow-yellow-400/20">
              <span className="text-xs md:text-sm font-black text-white">{podium[0].pontos} pts</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center order-3 md:order-3">
            <div className="relative mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-orange-300 overflow-hidden shadow-xl">
                <img src={podium[2].avatar_url || `https://ui-avatars.com/api/?name=${podium[2].nome}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 bg-orange-300 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Medal className="text-orange-700 w-3 h-3 md:w-4 md:h-4" />
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-center text-xs md:text-sm">{podium[2].nome}</h3>
            <div className="mt-2 bg-orange-100 px-3 py-1 rounded-lg">
              <span className="text-[10px] md:text-xs font-black text-orange-700">{podium[2].pontos} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Pos.</th>
                <th className="px-6 py-4">Jogador</th>
                <th className="px-6 py-4 text-center">Pontos</th>
                <th className="px-4 py-4 text-center">V</th>
                <th className="px-4 py-4 text-center">D</th>
                <th className="px-4 py-4 text-center">TJ</th>
                <th className="px-4 py-4 text-center">TJR</th>
                <th className="px-4 py-4 text-center">GG</th>
                <th className="px-4 py-4 text-center">GP</th>
                <th className="px-4 py-4 text-center">SG</th>
                <th className="px-6 py-4 text-right">Taxa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center text-slate-400 italic">
                    Nenhum jogador encontrado.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player, index) => (
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100">
                          <img src={player.avatar_url || `https://ui-avatars.com/api/?name=${player.nome}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none mb-1">{player.nome}</p>
                          <p className="text-[10px] text-slate-400">{player.email}</p>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
