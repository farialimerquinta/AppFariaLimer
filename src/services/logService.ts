import { supabase } from './supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Who is using the app right now, for logs written outside React components
export function getStoredUser(): { id: string | null; nome: string } {
  try {
    const raw = localStorage.getItem('faria_limer_demo_user');
    if (raw) {
      const u = JSON.parse(raw);
      return { id: u.id ?? null, nome: u.nome || 'Não identificado' };
    }
  } catch {
    // fall through
  }
  return { id: null, nome: 'Não identificado' };
}

export async function logActivity(usuario_id: string | null, usuario_nome: string, acao: string, detalhes: string, metadata?: any) {
  try {
    const { error } = await supabase
      .from('logs')
      .insert([
        {
          // Demo/manual users don't have a real UUID
          usuario_id: usuario_id && UUID_RE.test(usuario_id) ? usuario_id : null,
          usuario_nome,
          acao,
          detalhes,
          metadata: {
            ...(metadata || {}),
            pagina: window.location.pathname,
            dispositivo: navigator.userAgent
          }
        }
      ]);

    if (error) {
      console.error('Error recording log:', error);
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Records a failure in the audit log. `contexto` says what the user was doing.
export async function logError(contexto: string, err: any, metadata?: any) {
  const { id, nome } = getStoredUser();
  await logActivity(
    id,
    nome,
    `Erro: ${contexto}`,
    err?.message || String(err),
    {
      ...(metadata || {}),
      erro: {
        mensagem: err?.message || String(err),
        codigo: err?.code || null,
        detalhes: err?.details || null,
        dica: err?.hint || null
      }
    }
  );
}

// Catches crashes nobody handled, so they show up in the audit panel too
export function installGlobalErrorLogging() {
  const seen = new Set<string>();
  const MAX_PER_SESSION = 10;

  const report = (contexto: string, err: any, extra?: any) => {
    const key = `${contexto}:${err?.message || String(err)}`;
    if (seen.has(key) || seen.size >= MAX_PER_SESSION) return;
    seen.add(key);
    logError(contexto, err, { ...extra, stack: err?.stack ? String(err.stack).slice(0, 1500) : null });
  };

  window.addEventListener('error', (e) => {
    report('Falha inesperada na tela', e.error || new Error(e.message), { arquivo: e.filename, linha: e.lineno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    report('Falha inesperada (operação assíncrona)', e.reason);
  });
}
