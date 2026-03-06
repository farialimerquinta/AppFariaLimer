import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle, 
  Trophy, 
  Activity,
  History
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { recalculateRanking } from '../services/rankingService';
import { motion, AnimatePresence } from 'framer-motion'; 
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para garantir a tipagem dos dados
interface Log {
  id: string;
  created_at: string;
  usuario_nome: string;
  acao: string;
  detalhes: string;
  metadata?: Record<string, any> | null;
}

export function AdminLogsPage() {
  // Estados de Dados
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  // Estados de Busca e Paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const pageSize = 12;

  // Função para buscar logs do Supabase
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (searchTerm) {
        query = query.or(`usuario_nome.ilike.%${searchTerm}%,acao.ilike.%${searchTerm}%,detalhes.ilike.%${searchTerm}%`);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Erro na busca:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  // Carregar dados ao montar ou mudar página/busca
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Função para o botão de Recalcular
  const handleRecalculate = async () => {
    if (!window.confirm('Deseja recalcular todo o ranking?')) return;
    setRecalculating(true);
    try {
      const result = await recalculateRanking();
      if (result.success) {
        alert('Ranking recalculado com sucesso!');
        fetchLogs();
      } else {
        alert('Erro ao recalcular.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setRecalculating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
      {/* Header Estilo Premium */}
      <div className="bg-[#0F172A] rounded-[40px] p-8 md:p-12 mb-10 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-4">
            <span className="text-6xl font-black italic tracking-tighter text-yellow-500 drop-shadow-md">ATP</span>
            <span className="text-sm font-bold tracking-[0.6em] text-white/40 uppercase -mt-2">FARIA LIMER</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tight">
            Painel de <span className="text-yellow-500">Auditoria</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Histórico de movimentações e logs do sistema</p>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-8">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por usuário ou ação..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[20px] shadow-sm outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-medium"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchTerm((e.target as HTMLInputElement).value);
                setPage(1);
              }
            }}
          />
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
        >
          {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {recalculating ? 'Processando...' : 'Recalcular Ranking'}
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Sincronizando Banco...</span>
          </div>
        ) : error ? (
          <div className="py-24 text-center px-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">Erro de Carregamento</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">{error}</p>
            <button onClick={fetchLogs} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">Tentar Novamente</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-32 text-center">
            <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data / Hora</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuário</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalhes</th>
                </tr>
              </thead>
                      <tbody className="divide-y divide-slate-50">
                        {logs.map((log) => (
                          <React.Fragment key={log.id}>
                            <motion.tr 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                "hover:bg-slate-50/80 transition-colors cursor-pointer",
                                expandedLog === log.id && "bg-slate-50"
                              )}
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            >
                              <td className="px-4 md:px-8 py-4 md:py-6 whitespace-nowrap">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <CalendarIcon className="w-3 h-3 md:w-4 md:h-4 text-slate-300" />
                                  <div className="flex flex-col">
                                    <span className="text-[10px] md:text-xs font-bold text-slate-700">{format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                                    <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">{format(new Date(log.created_at), "HH:mm")}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 md:px-8 py-4 md:py-6 whitespace-nowrap">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center text-[8px] md:text-[10px] font-black text-slate-600 border border-slate-200">
                                    {log.usuario_nome?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <span className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-[80px] md:max-w-none">{log.usuario_nome}</span>
                                </div>
                              </td>
                              <td className="px-4 md:px-8 py-4 md:py-6 whitespace-nowrap">
                                <span className="bg-slate-900 text-yellow-500 px-2 py-0.5 md:px-3 md:py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                                  {log.acao}
                                </span>
                              </td>
                              <td className="px-4 md:px-8 py-4 md:py-6">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] md:text-xs text-slate-500 font-medium leading-relaxed truncate max-w-[100px] md:max-w-md">
                                    {log.detalhes}
                                  </p>
                                  {log.metadata && (
                                    <div className="bg-yellow-500/10 text-yellow-600 p-1 rounded-md">
                                      <Activity className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                            
                            {/* Metadata Expansion */}
                            <AnimatePresence>
                              {expandedLog === log.id && log.metadata && (
                                <motion.tr
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-slate-50/50"
                                >
                                  <td colSpan={4} className="px-4 md:px-8 py-4">
                                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-inner">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Activity className="w-3 h-3 text-yellow-600" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados da Modificação</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(log.metadata).map(([key, value]) => (
                                          <div key={key} className="flex flex-col gap-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                              {typeof value === 'object' ? (
                                                <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto">
                                                  {JSON.stringify(value, null, 2)}
                                                </pre>
                                              ) : (
                                                <span className="text-[11px] font-medium text-slate-700">{String(value)}</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        ))}
                      </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && totalPages > 1 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {page} de {totalPages}</span>
            <div className="flex gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}