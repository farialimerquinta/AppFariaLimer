import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, Search, Filter, Calendar as CalendarIcon, 
  User, Activity, Clock, ChevronLeft, ChevronRight, 
  Loader2, AlertCircle, RefreshCw, Trophy 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { recalculateRanking } from '../services/rankingService';
import { useAuth } from '../hooks/useAuth'; // Certifique-se que este caminho existe
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface robusta para os Logs
interface Log {
  id: string;
  created_at: string;
  usuario_nome: string;
  acao: string;
  detalhes: string;
  metadata?: Record<string, any> | null;
}

export function AdminLogsPage() {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para Busca com Debounce
  const [searchTerm, setSearchTerm] = useState(''); // O que o usuário digita
  const [debouncedSearch, setDebouncedSearch] = useState(''); // O que dispara o banco
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const pageSize = 15;

  // Efeito de Debounce: Espera 500ms após o usuário parar de digitar
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reseta para a primeira página em nova busca
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (debouncedSearch) {
        // Busca inteligente em múltiplas colunas
        query = query.or(`usuario_nome.ilike.%${debouncedSearch}%,acao.ilike.%${debouncedSearch}%,detalhes.ilike.%${debouncedSearch}%`);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Erro Supabase:', err);
      setError(err.message || 'Erro ao carregar logs do servidor.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRecalculate = async () => {
    const confirm = window.confirm('Deseja recalcular todo o ranking? Isso processará todos os jogos com as novas regras.');
    if (!confirm) return;
    
    setRecalculating(true);
    try {
      const result = await recalculateRanking();
      if (result.success) alert('Ranking atualizado!');
      else alert('Erro no processamento.');
    } catch (err) {
      alert('Erro inesperado ao conectar ao serviço de ranking.');
    } finally {
      setRecalculating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Header com Estilo Faria Limer */}
      <header className="relative bg-[#0F172A] rounded-[32px] p-8 mb-10 overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="flex flex-col items-center mb-4">
            <span className="text-5xl font-black italic tracking-tighter bg-gradient-to-b from-yellow-200 to-yellow-600 bg-clip-text text-transparent">
              ATP
            </span>
            <span className="text-xs font-bold tracking-[0.5em] text-yellow-500 uppercase">
              FARIA LIMER RANKING
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight">
            Painel de Auditoria <span className="text-yellow-500 text-4xl">.</span>
          </h1>
        </div>
      </header>

      {/* Controles de Filtro */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end mb-8">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Atividade</h2>
          <p className="text-slate-500 text-sm font-medium">Monitoramento em tempo real das ações do sistema.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Recalcular Ranking
          </button>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-yellow-500 outline-none shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
            <span className="text-xs font-black uppercase text-slate-400 tracking-tighter">Sincronizando com Supabase...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center max-w-2xl mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase">Falha na Conexão</h3>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <button onClick={fetchLogs} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Tentar Novamente</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 text-center">
            <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data & Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação Realizada</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode='popLayout'>
                  {logs.map((log) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter">
                            {format(new Date(log.created_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-black text-yellow-500">
                            {log.usuario_nome?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{log.usuario_nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          log.acao.includes('Login') ? "bg-blue-50 text-blue-600 border-blue-100" :
                          log.acao.includes('Erro') ? "bg-red-50 text-red-600 border-red-100" :
                          "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {log.acao}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-md">
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{log.detalhes}</p>
                          {log.metadata && (
                            <details className="mt-2 group/meta">
                              <summary className="text-[9px] font-black text-slate-400 uppercase cursor-pointer hover:text-yellow-600 transition-colors list-none flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Ver Metadados JSON
                              </summary>
                              <pre className="mt-2 p-3 bg-slate-900 rounded-xl text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-40 border border-white/5 shadow-inner leading-tight">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação Estilizada */}
        {!loading && totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Pagina {page} de {totalPages} <span className="mx-2">|</span> {totalCount} Eventos
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}