import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  Filter, 
  User as UserIcon, 
  Trophy, 
  Award, 
  Activity, 
  Mail, 
  Hash, 
  X, 
  Edit2, 
  Save, 
  Phone, 
  Calendar as CalendarIcon, 
  Weight, 
  Zap, 
  Layers,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Lock,
  Key
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { logActivity } from '../services/logService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface Player {
  id: string;
  nome: string;
  email: string;
  titulo_clube: string;
  categoria: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
  avatar_url: string | null;
  nivel_acesso: string;
  celular?: string;
  idade?: number;
  data_nascimento?: string;
  peso?: number;
  forehand?: 'destro' | 'canhoto';
  backhand?: 'uma mao' | 'duas maos';
}

const CATEGORIES = ['TODOS', 'Grand Slam', 'ATP 1000', 'ATP 500', 'ATP 250', 'Challenger'];

export function JogadoresPage() {
  const { user: currentUser } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODOS');
  
  // Profile Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Player>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // New Player Modal State
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState<Partial<Player & { senha_cpf: string }>>({
    categoria: 'Challenger',
    nivel_acesso: 'user',
    pontos: 0,
    vitorias: 0,
    derrotas: 0
  });

  // Change Password Modal State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || 
                           p.email.toLowerCase().includes(search.toLowerCase()) ||
                           p.titulo_clube.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'TODOS' || p.categoria === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [players, search, categoryFilter]);

  const handleOpenProfile = (player: Player) => {
    setSelectedPlayer(player);
    setEditForm(player);
    setIsEditing(false);
    setMessage(null);
  };

  const handleCloseProfile = () => {
    if (submitting) return;
    setSelectedPlayer(null);
    setIsEditing(false);
    setMessage(null);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return value;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'celular') {
      setEditForm(prev => ({ ...prev, [name]: formatPhone(value) }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlayer) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedPlayer.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
      setMessage({ type: 'success', text: 'Foto carregada com sucesso!' });
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setMessage({ type: 'error', text: 'Erro ao carregar foto. Verifique as permissões do bucket.' });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!selectedPlayer) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          nome: editForm.nome,
          email: editForm.email,
          celular: editForm.celular,
          idade: editForm.idade,
          data_nascimento: editForm.data_nascimento,
          peso: editForm.peso,
          forehand: editForm.forehand,
          backhand: editForm.backhand,
          avatar_url: editForm.avatar_url
        })
        .eq('id', selectedPlayer.id);

      if (error) throw error;

      // Log activity
      if (currentUser) {
        logActivity(
          currentUser.id,
          currentUser.nome,
          'Alteração de Perfil',
          `Perfil de ${selectedPlayer.nome} atualizado por ${currentUser.nome}.`
        );
      }

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setIsEditing(false);
      fetchPlayers(); // Refresh list
      
      // Update local selected player
      setSelectedPlayer(prev => prev ? { ...prev, ...editForm } as Player : null);
    } catch (err: any) {
      console.error('Error updating player:', err);
      setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePlayer = async () => {
    if (!newPlayerForm.nome || !newPlayerForm.email || !newPlayerForm.titulo_clube || !newPlayerForm.senha_cpf) {
      setMessage({ type: 'error', text: 'Preencha os campos obrigatórios: Nome, Email, Título e Senha.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('perfis')
        .insert([{
          nome: newPlayerForm.nome,
          email: newPlayerForm.email,
          titulo_clube: newPlayerForm.titulo_clube,
          senha_cpf: newPlayerForm.senha_cpf,
          categoria: newPlayerForm.categoria,
          nivel_acesso: newPlayerForm.nivel_acesso,
          pontos: newPlayerForm.pontos || 0,
          vitorias: newPlayerForm.vitorias || 0,
          derrotas: newPlayerForm.derrotas || 0,
          celular: newPlayerForm.celular,
          idade: newPlayerForm.idade,
          data_nascimento: newPlayerForm.data_nascimento,
          peso: newPlayerForm.peso,
          forehand: newPlayerForm.forehand,
          backhand: newPlayerForm.backhand
        }]);

      if (error) throw error;

      if (currentUser) {
        logActivity(
          currentUser.id,
          currentUser.nome,
          'Criação de Jogador',
          `Novo jogador ${newPlayerForm.nome} criado por ${currentUser.nome}.`
        );
      }

      setMessage({ type: 'success', text: 'Jogador criado com sucesso!' });
      setIsAddingPlayer(false);
      setNewPlayerForm({
        categoria: 'Challenger',
        nivel_acesso: 'user',
        pontos: 0,
        vitorias: 0,
        derrotas: 0
      });
      fetchPlayers();
    } catch (err: any) {
      console.error('Error creating player:', err);
      setMessage({ type: 'error', text: 'Erro ao criar jogador.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedPlayer || !newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem ou estão vazias.' });
      return;
    }

    setPasswordSubmitting(true);
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ senha_cpf: newPassword })
        .eq('id', selectedPlayer.id);

      if (error) throw error;

      if (currentUser) {
        logActivity(
          currentUser.id,
          currentUser.nome,
          'Alteração de Senha',
          `Senha de ${selectedPlayer.nome} alterada.`
        );
      }

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      setMessage({ type: 'error', text: 'Erro ao alterar senha.' });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="relative bg-[#0F172A] rounded-[32px] md:rounded-[40px] p-6 md:p-8 mb-8 md:mb-10 text-center overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1595435066359-62f32ff9d51d?q=80&w=1920&auto=format&fit=crop" 
            alt="Tennis Court" 
            className="w-full h-full object-cover opacity-10"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/60 to-[#0F172A]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center group cursor-pointer mb-4">
            <div className="relative">
              <span className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-2xl">
                ATP
              </span>
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white -rotate-12 transform -translate-y-1/2 opacity-40"></div>
            </div>
            <div className="mt-1 flex flex-col items-center">
              <span className="text-sm md:text-lg font-black tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                FARIA LIMER
              </span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2 italic tracking-tight uppercase">
            Gestão de <span className="text-yellow-500">Jogadores</span>
          </h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Jogadores</h1>
          <p className="text-sm md:text-base text-slate-500">Base completa de atletas do Faria Laimer.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => {
              setIsAddingPlayer(true);
              setMessage(null);
            }}
            className="flex items-center justify-center gap-2 px-6 py-2.5 md:py-3 bg-[#0F172A] text-white rounded-xl md:rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 uppercase tracking-widest"
          >
            <UserPlus className="w-4 h-4" />
            Inserir Novo Tenista
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer shadow-sm"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-[32px] p-20 text-center border border-dashed border-slate-200">
          <UserIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Nenhum jogador encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group"
            >
              {/* Card Header / Banner */}
              <div className="h-20 bg-[#0F172A] relative">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500 to-transparent"></div>
                </div>
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                    <img 
                      src={player.avatar_url || `https://ui-avatars.com/api/?name=${player.nome}&background=random`} 
                      alt={player.nome} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-12 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-slate-900 truncate">{player.nome}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                    <Mail className="w-3 h-3" />
                    <span className="text-[10px] font-medium truncate">{player.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoria</p>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-700">{player.categoria}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Título</p>
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-700">{player.titulo_clube}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      <span className="text-sm font-black text-slate-900">{player.pontos}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">W / L</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Activity className="w-3 h-3 text-emerald-500" />
                      <span className="text-sm font-black text-slate-900">
                        {player.vitorias} <span className="text-slate-300 font-medium">/</span> {player.derrotas}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <button 
                  onClick={() => handleOpenProfile(player)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-[#0F172A] hover:text-white text-slate-600 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest border border-slate-100"
                >
                  Ver Perfil Completo
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 flex-shrink-0 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900">Perfil do Atleta</h2>
                    <p className="text-[10px] md:text-xs text-slate-400">Informações detalhadas e edição</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  {(!isEditing && (currentUser?.id === selectedPlayer.id || currentUser?.nivel_acesso === 'admin')) && (
                    <div className="flex items-center gap-2">
                      {currentUser?.id === selectedPlayer.id && (
                        <button 
                          onClick={() => setIsChangingPassword(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] md:text-xs font-black hover:bg-slate-200 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          MODIFICAR SENHA
                        </button>
                      )}
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] md:text-xs font-black hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        EDITAR
                      </button>
                    </div>
                  )}
                  {isEditing && (
                    <button 
                      onClick={handleUpdatePlayer}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] md:text-xs font-black hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      SALVAR
                    </button>
                  )}
                  <button 
                    onClick={handleCloseProfile}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl flex items-center gap-3 mb-6 text-[10px] md:text-sm font-bold",
                      message.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                  </motion.div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column: Photo & Basic Stats */}
                  <div className="flex flex-col items-center gap-6 w-full lg:w-1/3">
                    <div className="relative group">
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] md:rounded-[40px] border-4 border-slate-100 bg-slate-50 overflow-hidden shadow-xl">
                        <img 
                          src={editForm.avatar_url || `https://ui-avatars.com/api/?name=${selectedPlayer.nome}&size=200`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {isEditing && (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="absolute bottom-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-[#0F172A] text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin" /> : <Camera className="w-4 md:w-5 h-4 md:h-5" />}
                        </button>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </div>

                    <div className="w-full space-y-3">
                      <div className="bg-slate-50 p-4 rounded-[24px] md:rounded-3xl border border-slate-100 text-center">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pontuação</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900">{selectedPlayer.pontos} pts</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 p-3 rounded-xl md:rounded-2xl border border-emerald-100 text-center">
                          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Vitórias</p>
                          <p className="text-base md:text-lg font-black text-emerald-700">{selectedPlayer.vitorias}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-xl md:rounded-2xl border border-red-100 text-center">
                          <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-1">Derrotas</p>
                          <p className="text-base md:text-lg font-black text-red-700">{selectedPlayer.derrotas}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Form Fields */}
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      {/* Nome Completo */}
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <UserIcon className="w-3 h-3" /> Nome Completo
                        </label>
                        <input 
                          type="text" 
                          name="nome"
                          value={editForm.nome || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Mail className="w-3 h-3" /> Email
                        </label>
                        <input 
                          type="email" 
                          name="email"
                          value={editForm.email || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70"
                        />
                      </div>

                      {/* Celular */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Phone className="w-3 h-3" /> Celular
                        </label>
                        <input 
                          type="text" 
                          name="celular"
                          placeholder="(xx) xxxxx-xxxx"
                          value={editForm.celular || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70"
                        />
                      </div>

                      {/* Idade */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3" /> Idade
                        </label>
                        <input 
                          type="number" 
                          name="idade"
                          value={editForm.idade || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70"
                        />
                      </div>

                      {/* Data de Nascimento */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3" /> Data de Nascimento
                        </label>
                        <input 
                          type="date" 
                          name="data_nascimento"
                          value={editForm.data_nascimento || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70"
                        />
                      </div>

                      {/* Peso */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Weight className="w-3 h-3" /> Peso (kg)
                        </label>
                        <input 
                          type="number" 
                          name="peso"
                          value={editForm.peso || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70"
                        />
                      </div>

                      {/* Forehand */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3 h-3" /> Forehand
                        </label>
                        <select 
                          name="forehand"
                          value={editForm.forehand || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70 appearance-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="destro">Destro</option>
                          <option value="canhoto">Canhoto</option>
                        </select>
                      </div>

                      {/* Backhand */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Layers className="w-3 h-3" /> Backhand
                        </label>
                        <select 
                          name="backhand"
                          value={editForm.backhand || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-70 appearance-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="uma mao">Uma mão</option>
                          <option value="duas maos">Duas mãos</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                <button 
                  onClick={handleCloseProfile}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl md:rounded-2xl hover:bg-slate-100 transition-colors text-[10px] md:text-xs uppercase tracking-widest"
                >
                  Fechar
                </button>
                {isEditing && (
                  <button 
                    onClick={handleUpdatePlayer}
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 bg-[#0F172A] text-white font-black rounded-xl md:rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Player Modal */}
      <AnimatePresence>
        {isAddingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#0F172A] uppercase italic tracking-tighter">Novo Tenista</h2>
                    <p className="text-xs text-slate-400 font-medium">Cadastro manual de atleta</p>
                  </div>
                </div>
                <button onClick={() => setIsAddingPlayer(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Obrigatório</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Nome Completo</label>
                      <input type="text" value={newPlayerForm.nome || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, nome: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Email</label>
                      <input type="email" value={newPlayerForm.email || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, email: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Título do Clube</label>
                      <input type="text" value={newPlayerForm.titulo_clube || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, titulo_clube: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Senha / CPF</label>
                      <input type="text" value={newPlayerForm.senha_cpf || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, senha_cpf: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Competição</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Categoria</label>
                      <select value={newPlayerForm.categoria} onChange={(e) => setNewPlayerForm(p => ({ ...p, categoria: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                        {CATEGORIES.filter(c => c !== 'TODOS').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase">Pontos</label>
                        <input type="number" value={newPlayerForm.pontos} onChange={(e) => setNewPlayerForm(p => ({ ...p, pontos: parseInt(e.target.value) }))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase">Vitórias</label>
                        <input type="number" value={newPlayerForm.vitorias} onChange={(e) => setNewPlayerForm(p => ({ ...p, vitorias: parseInt(e.target.value) }))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase">Derrotas</label>
                        <input type="number" value={newPlayerForm.derrotas} onChange={(e) => setNewPlayerForm(p => ({ ...p, derrotas: parseInt(e.target.value) }))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Forehand</label>
                      <select value={newPlayerForm.forehand || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, forehand: e.target.value as any }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecione...</option>
                        <option value="destro">Destro</option>
                        <option value="canhoto">Canhoto</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Backhand</label>
                      <select value={newPlayerForm.backhand || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, backhand: e.target.value as any }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecione...</option>
                        <option value="uma mao">Uma mão</option>
                        <option value="duas maos">Duas mãos</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Pessoal</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Celular</label>
                      <input type="text" value={newPlayerForm.celular || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, celular: formatPhone(e.target.value) }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Idade</label>
                      <input type="number" value={newPlayerForm.idade || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, idade: parseInt(e.target.value) }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Data de Nascimento</label>
                      <input type="date" value={newPlayerForm.data_nascimento || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, data_nascimento: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Peso (kg)</label>
                      <input type="number" value={newPlayerForm.peso || ''} onChange={(e) => setNewPlayerForm(p => ({ ...p, peso: parseInt(e.target.value) }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setIsAddingPlayer(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest">Cancelar</button>
                <button 
                  onClick={handleCreatePlayer}
                  disabled={submitting}
                  className="px-8 py-3 bg-[#0F172A] text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Criar Jogador
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <Key className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0F172A] uppercase italic tracking-tighter">Alterar Senha</h2>
                  <p className="text-xs text-slate-400 font-medium">Defina uma nova senha de acesso</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="flex-1 py-4 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleChangePassword}
                    disabled={passwordSubmitting}
                    className="flex-1 py-4 bg-[#0F172A] text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {passwordSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
