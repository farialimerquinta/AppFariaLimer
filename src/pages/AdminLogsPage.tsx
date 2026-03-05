import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  User, 
  Activity, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { recalculateRanking } from '../services/rankingService';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Log {
  id: string;
  created_at: string;
  usuario_nome: string;
  acao: string;
  detalhes: string;
}

export function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  const handleRecalculate = async () => {
    if (!confirm('Deseja recalcular todo o ranking? Isso processará todos os jogos realizados com as novas regras de pontuação (Vitória: 3, Derrota: 1, WO: 0).')) return;
    
    setRecalculating(true);
    try {
      const result = await recalculateRanking();
      if (result.success) {
        alert('Ranking recalculado com sucesso!');
      } else {
        alert('Erro ao recalcular ranking.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado.');
    } finally {
      setRecalculating(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search) {
        query = query.or(`usuario_nome.ilike.%${search}%,acao.ilike.%${search}%,detalhes.ilike.%${search}%`);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        // If table doesn't exist, show a friendly message
        if (fetchError.code === '42P01' || fetchError.message?.includes('schema cache')) {
          throw new Error('A tabela "logs" não foi encontrada no banco de dados. Por favor, execute o script SQL de criação no painel do Supabase.');
        }
        throw fetchError;
      }

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="relative bg-[#0F172A] rounded-[32px] md:rounded-[40px] p-6 md:p-8 mb-8 md:mb-10 text-center overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1454165833767-027ffea9e778?q=80&w=1920&auto=format&fit=crop" 
            alt="Logs Background" 
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Histórico de Atividades</h2>
          <p className="text-sm md:text-base text-slate-500">Acompanhe todos os acessos e alterações realizados.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            {recalculating ? 'Processando...' : 'Recalcular Ranking'}
          </button>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por usuário, ação ou detalhe..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando logs...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic">Ops! Algo deu errado</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
            
            {error.includes('tabela "logs"') && (
              <div className="mb-8 p-4 bg-slate-900 rounded-2xl text-left overflow-x-auto max-w-xl mx-auto">
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2">Script SQL para criar a tabela:</p>
                <pre className="text-[10px] text-slate-300 font-mono leading-relaxed">
{`CREATE TABLE logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  acao TEXT,
  detalhes TEXT
);

-- Habilitar RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Política para leitura (Admin apenas)
CREATE POLICY "Admins can read logs" ON logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND nivel_acesso = 'admin'
    )
  );

-- Política para inserção (Qualquer autenticado)
CREATE POLICY "Authenticated users can insert logs" ON logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');`}
                </pre>
              </div>
            )}

            <button 
              onClick={fetchLogs}
              className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <History className="w-8 h-8" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold">
                          {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <span className="text-xs font-medium">
                          {format(new Date(log.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                          {log.usuario_nome.charAt(0)}
                        </div>
                        <span className="text-xs font-black text-slate-900">{log.usuario_nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        log.acao.includes('Login') ? "bg-blue-50 text-blue-600" :
                        log.acao.includes('Registro') ? "bg-emerald-50 text-emerald-600" :
                        log.acao.includes('Agendamento') ? "bg-purple-50 text-purple-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 font-medium max-w-md truncate" title={log.detalhes}>
                        {log.detalhes}
                      </p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Mostrando {logs.length} de {totalCount} logs
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
                  if (totalPages > 5) {
                    if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                  } else {
                    pageNum = i + 1;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-xl text-xs font-black transition-all",
                        page === pageNum 
                          ? "bg-[#0F172A] text-white shadow-lg shadow-slate-900/20" 
                          : "hover:bg-white text-slate-400"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-slate-200 hover:bg-white disabled:opacity-30 transition-all"
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
