import { supabase } from './supabase';

export async function logActivity(usuario_id: string, usuario_nome: string, acao: string, detalhes: string, metadata?: any) {
  try {
    const { error } = await supabase
      .from('logs')
      .insert([
        {
          usuario_id,
          usuario_nome,
          acao,
          detalhes,
          metadata: metadata || null
        }
      ]);

    if (error) {
      console.error('Error recording log:', error);
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
