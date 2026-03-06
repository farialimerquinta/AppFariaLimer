import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  PlusCircle,
  Calendar,
  History,
  Loader2,
  User as UserIcon,
  LayoutDashboard,
  ArrowLeftRight,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Jogo {
  id: string;
  data_jogo: string;
  status: string;
  categoria_evento: string;
  jogador1: { nome: string; avatar_url: string | null; ativo?: boolean };
  jogador2: { nome: string; avatar_url: string | null; ativo?: boolean };
  resultado?: {
    vencedor_id: string;
    placar_set1: string;
    placar_set2: string;
    placar_set3: string | null;
    is_wo: boolean;
  };
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proximosJogos, setProximosJogos] = useState<Jogo[]>([]);
  const [resultadosRecentes, setResultadosRecentes] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);

  const [jogosFaltam, setJogosFaltam] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch upcoming games
      const { data: upcoming } = await supabase
        .from('jogos')
        .select(`
          id,
          data_jogo,
          status,
          categoria_evento,
          jogador1:jogador1_id(id, nome, avatar_url, ativo, nivel_acesso),
          jogador2:jogador2_id(id, nome, avatar_url, ativo, nivel_acesso)
        `)
        .eq('status', 'agendado')
        .gte('data_jogo', new Date().toISOString())
        .order('data_jogo', { ascending: true })
        .limit(3);

      // Fetch recent results
      const { data: recent } = await supabase
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
        .eq('status', 'realizado')
        .order('data_jogo', { ascending: false })
        .limit(3);

      // Fetch count of upcoming games for the current user
      if (user) {
        const { count } = await supabase
          .from('jogos')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'agendado')
          .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id}`);
        
        setJogosFaltam(count || 0);
      }

      if (upcoming) {
        const filteredUpcoming = (upcoming as any[]).filter(j => 
          j.jogador1?.ativo !== false && j.jogador2?.ativo !== false &&
          j.jogador1?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' && j.jogador2?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
          j.jogador1?.nome !== 'DJOKO MASTER' && j.jogador2?.nome !== 'DJOKO MASTER'
        );
        setProximosJogos(filteredUpcoming);
      }
      if (recent) {
        const filteredRecent = (recent as any[]).filter(j => 
          j.jogador1?.ativo !== false && j.jogador2?.ativo !== false &&
          j.jogador1?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' && j.jogador2?.nivel_acesso?.toUpperCase() !== 'ADMIN_MASTER' &&
          j.jogador1?.nome !== 'DJOKO MASTER' && j.jogador2?.nome !== 'DJOKO MASTER'
        );
        setResultadosRecentes(filteredRecent);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const isDemo = useMemo(() => !!localStorage.getItem('faria_limer_demo_user'), []);

  const stats = useMemo(() => [
    { label: 'SUA POSIÇÃO', value: '#1', sub: user?.categoria || 'Challenger', icon: Trophy, color: 'bg-red-500' },
    { label: 'SEUS PONTOS', value: user?.pontos || 0, sub: '', icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'W/L', value: `${user?.vitorias || 0}-${user?.derrotas || 0}`, sub: 'Aproveitamento', icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'JOGOS FALTAM', value: jogosFaltam.toString(), sub: 'Para realizar', icon: Clock, color: 'bg-orange-500' },
  ], [user, jogosFaltam]);

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
      <div className="relative bg-[#0F172A] rounded-[32px] md:rounded-[40px] p-6 md:p-12 mb-8 md:mb-10 text-center overflow-hidden shadow-2xl border border-white/5">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1595435066359-62f32ff9d51d?q=80&w=1920&auto=format&fit=crop" 
            alt="Tennis Court" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/60 to-[#0F172A]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center group cursor-pointer mb-6 md:mb-8">
            <div className="relative pr-4">
              <span className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-2xl">
                ATP
              </span>
              <div className="absolute top-1/2 left-0 w-[calc(100%-1rem)] h-[2px] md:h-[3px] bg-white -rotate-12 transform -translate-y-1/2 opacity-40"></div>
            </div>
            <div className="mt-1 flex flex-col items-center">
              <span className="text-sm md:text-xl font-black tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                FARIA LIMER
              </span>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-4 md:mb-6"
          >
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-[8px] md:text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Temporada 2026</span>
          </motion.div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic leading-tight">
            RANKING FARIA LIMER <span className="text-yellow-500">|</span> QUINTA
          </h1>
          <p className="text-slate-300 text-base md:text-xl font-medium tracking-wide">
            Onde os campeões se encontram toda quinta-feira!
          </p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <LayoutDashboard className="w-5 h-5 text-slate-400" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Acesso Rápido</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3 md:gap-4">
          {[
            { label: 'Início', icon: LayoutDashboard, path: '/', color: 'bg-slate-100 text-slate-600' },
            { label: 'Agendar', icon: PlusCircle, path: '/agendar-jogos', color: 'bg-blue-50 text-blue-600' },
            { label: 'Jogos', icon: Calendar, path: '/jogos', color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Placar', icon: CheckCircle2, path: '/registrar-resultado', color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Ranking', icon: Trophy, path: '/ranking', color: 'bg-red-50 text-red-600' },
            { label: 'H2H', icon: ArrowLeftRight, path: '/h2h', color: 'bg-orange-50 text-orange-600' },
            { label: 'Jogadores', icon: Users, path: '/jogadores', color: 'bg-purple-50 text-purple-600' },
            ...(user?.nivel_acesso === 'ADMIN_MASTER' || user?.nivel_acesso === 'ADMIN_TENISTA' ? [{ label: 'Admin', icon: UserIcon, path: '/admin/usuarios', color: 'bg-slate-900 text-white' }] : []),
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="group flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.05] active:scale-95 transition-all"
            >
              <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", item.color)}>
                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.color)}>
              <stat.icon className="text-white w-6 h-6" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h2 className="text-3xl font-black text-slate-900 mb-1">{stat.value}</h2>
            <p className="text-xs text-slate-500">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600 w-5 h-5" />
              <h3 className="font-bold text-slate-900">Próximos Jogos</h3>
            </div>
            <button onClick={() => navigate('/jogos')} className="text-xs font-bold text-blue-600 hover:underline">Ver todos</button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : proximosJogos.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm italic">
                Nenhum jogo agendado para os próximos dias.
              </div>
            ) : (
              <div className="space-y-4">
                {proximosJogos.map((jogo) => (
                  <div key={jogo.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img 
                          src={jogo.jogador1.avatar_url || `https://ui-avatars.com/api/?name=${jogo.jogador1.nome}`} 
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                          alt=""
                        />
                        <img 
                          src={jogo.jogador2.avatar_url || `https://ui-avatars.com/api/?name=${jogo.jogador2.nome}`} 
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                          alt=""
                        />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{jogo.jogador1.nome.split(' ')[0]} vs {jogo.jogador2.nome.split(' ')[0]}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{jogo.categoria_evento}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">{format(new Date(jogo.data_jogo), 'dd/MM')}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{format(new Date(jogo.data_jogo), 'HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="text-red-600 w-5 h-5" />
              <h3 className="font-bold text-slate-900">Resultados Recentes</h3>
            </div>
            <button onClick={() => navigate('/jogos')} className="text-xs font-bold text-red-600 hover:underline">Ver todos</button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
              </div>
            ) : resultadosRecentes.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm italic">
                Nenhum resultado registrado recentemente.
              </div>
            ) : (
              <div className="space-y-4">
                {resultadosRecentes.map((jogo) => (
                  <div key={jogo.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {jogo.jogador1.nome.split(' ')[0]} vs {jogo.jogador2.nome.split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                          {Array.isArray(jogo.resultado) 
                            ? `${jogo.resultado[0]?.placar_set1 || ''} ${jogo.resultado[0]?.placar_set2 || ''} ${jogo.resultado[0]?.placar_set3 || ''}`
                            : `${(jogo.resultado as any)?.placar_set1 || ''} ${(jogo.resultado as any)?.placar_set2 || ''} ${(jogo.resultado as any)?.placar_set3 || ''}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">{format(new Date(jogo.data_jogo), 'dd/MM')}</p>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
