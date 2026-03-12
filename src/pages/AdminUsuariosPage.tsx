import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  User as UserIcon, 
  Shield, 
  Mail, 
  Hash, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Trash2,
  Lock
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { logActivity } from '../services/logService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  titulo_clube: string;
  categoria: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
  avatar_url: string | null;
  nivel_acesso: 'ADMIN_MASTER' | 'ADMIN_TENISTA' | 'ADMIN' | 'user';
  senha_cpf: string;
  celular?: string;
  idade?: number;
  data_nascimento?: string;
  peso?: number;
  forehand?: string;
  backhand?: string;
  ativo: boolean;
}

const CATEGORIES = ['Grand Slam', 'ATP 1000', 'ATP 500', 'ATP 250', 'Challenger'];
const ACCESS_LEVELS = ['ADMIN_MASTER', 'ADMIN_TENISTA', 'ADMIN', 'user'];

export function AdminUsuariosPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODOS');
  
  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      if (data) setUsers(data as UserProfile[]);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.nome.toLowerCase().includes(search.toLowerCase()) || 
                           u.email.toLowerCase().includes(search.toLowerCase()) ||
                           u.titulo_clube.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'TODOS' || u.categoria === categoryFilter;
      const isNotMaster = u.nivel_acesso !== 'ADMIN_MASTER' && u.nome !== 'DJOKO MASTER';
      
      return matchesSearch && matchesCategory && isNotMaster;
    });
  }, [users, search, categoryFilter]);

  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm(user);
    setMessage(null);
  };

  const handleCloseEdit = () => {
    if (submitting) return;
    setSelectedUser(null);
    setMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          nome: editForm.nome,
          email: editForm.email,
          titulo_clube: editForm.titulo_clube,
          categoria: editForm.categoria,
          nivel_acesso: editForm.nivel_acesso,
          senha_cpf: editForm.senha_cpf,
          celular: editForm.celular,
          idade: editForm.idade,
          data_nascimento: editForm.data_nascimento,
          peso: editForm.peso,
          forehand: editForm.forehand,
          backhand: editForm.backhand,
          pontos: editForm.pontos,
          vitorias: editForm.vitorias,
          derrotas: editForm.derrotas,
          ativo: editForm.ativo
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log activity
      if (currentUser) {
        await logActivity(
          currentUser.id,
          currentUser.nome,
          'Admin: Alteração de Usuário',
          `Administrador ${currentUser.nome} atualizou o cadastro de ${selectedUser.nome}.`
        );
      }

      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
      fetchUsers();
      setTimeout(() => handleCloseEdit(), 1500);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setMessage({ type: 'error', text: 'Erro ao atualizar usuário.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = () => {
    // Just set a default password in the form
    setEditForm(prev => ({ ...prev, senha_cpf: '123456' }));
    setMessage({ type: 'success', text: 'Senha resetada no formulário para "123456". Clique em SALVAR para confirmar.' });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] uppercase italic tracking-tighter">Admin Usuários</h1>
          <p className="text-slate-500 font-medium">Gestão completa de cadastros e permissões.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm"
          >
            <option value="TODOS">Todas Categorias</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'ativos') {
                setUsers(prev => prev.filter(u => u.ativo));
              } else if (val === 'inativos') {
                setUsers(prev => prev.filter(u => !u.ativo));
              } else {
                fetchUsers();
              }
            }}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm"
          >
            <option value="todos">Todos Status</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Título / Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stats</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                          <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.nome}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{u.nome}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{u.titulo_clube}</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase">{u.categoria}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        u.nivel_acesso === 'ADMIN_MASTER' ? "bg-purple-100 text-purple-600" :
                        u.nivel_acesso === 'ADMIN_TENISTA' ? "bg-orange-100 text-orange-600" : 
                        u.nivel_acesso === 'ADMIN' ? "bg-emerald-100 text-emerald-600" :
                        "bg-blue-100 text-blue-600"
                      )}>
                        {u.nivel_acesso}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Pts</p>
                          <p className="text-xs font-bold text-slate-900">{u.pontos}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase">W/L</p>
                          <p className="text-xs font-bold text-slate-900">{u.vitorias}/{u.derrotas}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        u.ativo ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                      )}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#0F172A] uppercase italic tracking-tighter">Editar Usuário</h2>
                    <p className="text-xs text-slate-400 font-medium">Controle total do cadastro de {selectedUser.nome}</p>
                  </div>
                </div>
                <button onClick={handleCloseEdit} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {message && (
                  <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-3 mb-8 text-sm font-bold",
                    message.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Informações Básicas</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Nome Completo</label>
                        <input type="text" name="nome" value={editForm.nome || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Email</label>
                        <input type="email" name="email" value={editForm.email || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Título do Clube</label>
                        <input type="text" name="titulo_clube" value={editForm.titulo_clube || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Competition & Access */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Competição & Acesso</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Categoria</label>
                        <select name="categoria" value={editForm.categoria || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Nível de Acesso</label>
                        <select name="nivel_acesso" value={editForm.nivel_acesso || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                          {ACCESS_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-between">
                          Senha / CPF
                          <button onClick={handleResetPassword} className="text-[8px] text-blue-600 hover:underline">RESETAR PARA 123456</button>
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" name="senha_cpf" value={editForm.senha_cpf || ''} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Estatísticas</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Pontos no Ranking</label>
                        <input type="number" name="pontos" value={editForm.pontos || 0} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Vitórias</label>
                          <input type="number" name="vitorias" value={editForm.vitorias || 0} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Derrotas</label>
                          <input type="number" name="derrotas" value={editForm.derrotas || 0} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="md:col-span-3 space-y-6 pt-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Informações Adicionais</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Celular</label>
                        <input type="text" name="celular" value={editForm.celular || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Data de Nascimento</label>
                        <input type="date" name="data_nascimento" value={editForm.data_nascimento || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Peso (kg)</label>
                        <input type="number" name="peso" value={editForm.peso || 0} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Forehand</label>
                        <select name="forehand" value={editForm.forehand || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Selecione...</option>
                          <option value="destro">Destro</option>
                          <option value="canhoto">Canhoto</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Backhand</label>
                        <select name="backhand" value={editForm.backhand || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Selecione...</option>
                          <option value="uma mao">Uma mão</option>
                          <option value="duas maos">Duas mãos</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Status da Conta</label>
                        <select 
                          name="ativo" 
                          value={editForm.ativo ? 'true' : 'false'} 
                          onChange={(e) => setEditForm(prev => ({ ...prev, ativo: e.target.value === 'true' }))}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={handleCloseEdit} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest">Cancelar</button>
                <button 
                  onClick={handleUpdateUser}
                  disabled={submitting}
                  className="px-8 py-3 bg-[#0F172A] text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
