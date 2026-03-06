import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

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
  nivel_acesso: 'ADMIN_MASTER' | 'ADMIN_TENISTA' | 'user';
  ativo: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (tituloClube: string, senhaCpf: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo session first
    const demoUserStr = localStorage.getItem('faria_limer_demo_user');
    if (demoUserStr) {
      setUser(JSON.parse(demoUserStr));
      setLoading(false);
      return;
    }

    // Check for existing Supabase session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser(profile);
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (tituloClube: string, senhaCpf: string) => {
    try {
      // MODO DEMONSTRAÇÃO: Bypass para testes rápidos
      if (tituloClube === 'ADMIN01' && senhaCpf === '1234') {
        const demoUser: UserProfile = {
          id: 'demo-admin-id',
          nome: 'Administrador Demo',
          email: 'admin@demo.com',
          titulo_clube: 'ADMIN01',
          categoria: 'Grand Slam',
          pontos: 2500,
          vitorias: 15,
          derrotas: 2,
          avatar_url: 'https://ui-avatars.com/api/?name=Admin+Demo&background=0D8ABC&color=fff',
          nivel_acesso: 'ADMIN_MASTER',
          ativo: true,
        };
        setUser(demoUser);
        localStorage.setItem('faria_limer_demo_user', JSON.stringify(demoUser));
        return { error: null };
      }

      // REAL IMPLEMENTATION (Supabase)
      const { data: profile, error: profileError } = await supabase
        .from('perfis')
        .select('*')
        .eq('titulo_clube', tituloClube)
        .single();

      if (profileError || !profile) {
        return { error: 'Usuário não encontrado.' };
      }

      if (profile.ativo === false) {
        return { error: 'Este usuário está inativo e não pode acessar o sistema.' };
      }

      if (profile.senha_cpf !== senhaCpf) {
        return { error: 'Senha incorreta.' };
      }

      // LOGIN BEYOND AUTH: If it matches in the table, we consider it logged in
      // This supports manually created users with ID 0000...
      setUser(profile);
      localStorage.setItem('faria_limer_demo_user', JSON.stringify(profile));

      // Optional: Try to sign in to Supabase Auth in background if it's a real user
      if (profile.id !== '00000000-0000-0000-0000-000000000000') {
        await supabase.auth.signInWithPassword({
          email: profile.email,
          password: senhaCpf,
        }).catch(() => {
          // Ignore auth errors if we already validated via table
        });
      }

      return { error: null };
    } catch (err) {
      return { error: 'Erro ao realizar login.' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('faria_limer_demo_user');
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
