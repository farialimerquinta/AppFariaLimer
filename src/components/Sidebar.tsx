import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Trophy, 
  Users, 
  PlusCircle, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  Trash2,
  History,
  ChevronRight,
  Menu,
  X,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils';

const menuItems = [
  { name: 'Início', path: '/', icon: Home },
  { name: 'Agendar Jogos', path: '/agendar-jogos', icon: Calendar },
  { name: 'Jogos', path: '/jogos', icon: Calendar },
  { name: 'Registrar Resultado', path: '/registrar-resultado', icon: PlusCircle },
  { name: 'Ranking', path: '/ranking', icon: Trophy },
  { name: 'H2H', path: '/h2h', icon: ArrowRightLeft },
  { name: 'Jogadores', path: '/jogadores', icon: Users },
];

const adminItems = [
  { name: 'Admin Usuários', path: '/admin/usuarios', icon: ShieldAlert },
  { name: 'Logs de Sistema', path: '/admin/logs', icon: History },
  { name: 'Reset All Data', path: '/admin/reset', icon: Trash2, variant: 'danger' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#0F172A] text-white p-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black italic tracking-tighter bg-gradient-to-b from-yellow-200 to-yellow-600 bg-clip-text text-transparent">
            ATP
          </span>
          <span className="text-[10px] font-black tracking-widest text-yellow-500 uppercase">
            FARIA LIMER
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-300 flex flex-col h-screen border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 border-b border-slate-800/50 hidden lg:block">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="flex flex-col items-center">
                <div className="relative pr-2">
                  <span className="text-5xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 bg-clip-text text-transparent drop-shadow-md">
                    ATP
                  </span>
                  <div className="absolute top-1/2 left-0 w-[calc(100%-0.5rem)] h-[2px] bg-[#0F172A] -rotate-12 transform -translate-y-1/2 opacity-50"></div>
                </div>
                <div className="mt-1 flex flex-col items-center">
                  <span className="text-[12px] font-black tracking-[0.3em] bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase leading-none">
                    FARIA LIMER
                  </span>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[6px] font-bold text-yellow-500/50">2026</span>
                    <span className="text-[6px] font-bold text-yellow-500/50">2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-[#1E293B] text-white shadow-sm" 
                  : "hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                "group-hover:scale-110 transition-transform"
              )} />
              <span className="text-sm font-medium">{item.name}</span>
            </NavLink>
          ))}

          {user?.nivel_acesso === 'admin' && (
            <div className="pt-6 mt-6 border-t border-slate-800 space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Administração</p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive 
                      ? "bg-[#1E293B] text-white" 
                      : "hover:bg-slate-800/50 hover:text-white",
                    item.variant === 'danger' && "text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full border border-current opacity-50",
                    item.variant === 'danger' && "bg-red-500 border-red-500"
                  )} />
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user?.nome.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.nome}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              {user?.nivel_acesso === 'admin' && (
                <span className="text-[10px] bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
                  👑 Admin
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
