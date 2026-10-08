-- Migração: backup automático de placares + virada de temporada - FARIA LIMER
-- Rodar UMA vez no SQL Editor do Supabase, ANTES de publicar a nova versão do app.
-- Requer supabase_migration_arquivar_jogos.sql já aplicado (coluna jogos.arquivado).

-- =====================================================================
-- 1. BACKUP AUTOMÁTICO DE PLACARES
-- =====================================================================
-- Cada placar lançado, alterado ou apagado gera uma linha aqui, com nomes e
-- datas copiados (sem chave estrangeira), então a linha sobrevive mesmo que o
-- jogo ou o jogador seja apagado depois.
CREATE TABLE IF NOT EXISTS backup_resultados (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE ou CARGA_INICIAL
  registrado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID,
  resultado_id UUID,
  jogo_id UUID,
  data_jogo TIMESTAMP WITH TIME ZONE,
  categoria_evento TEXT,
  jogador1_id UUID,
  jogador1_nome TEXT,
  jogador2_id UUID,
  jogador2_nome TEXT,
  vencedor_id UUID,
  vencedor_nome TEXT,
  is_wo BOOLEAN,
  placar_set1 TEXT,
  placar_set2 TEXT,
  placar_set3 TEXT
);

-- RLS ligado e sem políticas: o app (chave pública) não lê nem altera o backup.
-- Só o painel do Supabase e as funções abaixo (SECURITY DEFINER) têm acesso.
ALTER TABLE backup_resultados ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION fn_backup_resultado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res resultados%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN v_res := OLD; ELSE v_res := NEW; END IF;

    INSERT INTO backup_resultados (
        operacao, usuario_id, resultado_id, jogo_id, data_jogo, categoria_evento,
        jogador1_id, jogador1_nome, jogador2_id, jogador2_nome,
        vencedor_id, vencedor_nome, is_wo, placar_set1, placar_set2, placar_set3
    )
    SELECT
        TG_OP, auth.uid(), v_res.id, v_res.jogo_id, j.data_jogo, j.categoria_evento,
        j.jogador1_id, p1.nome, j.jogador2_id, p2.nome,
        v_res.vencedor_id, pv.nome, v_res.is_wo, v_res.placar_set1, v_res.placar_set2, v_res.placar_set3
    FROM (SELECT 1) AS x
    LEFT JOIN jogos j ON j.id = v_res.jogo_id
    LEFT JOIN perfis p1 ON p1.id = j.jogador1_id
    LEFT JOIN perfis p2 ON p2.id = j.jogador2_id
    LEFT JOIN perfis pv ON pv.id = v_res.vencedor_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_backup_resultado ON resultados;
CREATE TRIGGER tg_backup_resultado
AFTER INSERT OR UPDATE OR DELETE ON resultados
FOR EACH ROW EXECUTE FUNCTION fn_backup_resultado();

-- Carga inicial: copia os placares que já existem hoje (só na primeira execução)
INSERT INTO backup_resultados (
    operacao, resultado_id, jogo_id, data_jogo, categoria_evento,
    jogador1_id, jogador1_nome, jogador2_id, jogador2_nome,
    vencedor_id, vencedor_nome, is_wo, placar_set1, placar_set2, placar_set3
)
SELECT
    'CARGA_INICIAL', r.id, r.jogo_id, j.data_jogo, j.categoria_evento,
    j.jogador1_id, p1.nome, j.jogador2_id, p2.nome,
    r.vencedor_id, pv.nome, r.is_wo, r.placar_set1, r.placar_set2, r.placar_set3
FROM resultados r
LEFT JOIN jogos j ON j.id = r.jogo_id
LEFT JOIN perfis p1 ON p1.id = j.jogador1_id
LEFT JOIN perfis p2 ON p2.id = j.jogador2_id
LEFT JOIN perfis pv ON pv.id = r.vencedor_id
WHERE NOT EXISTS (SELECT 1 FROM backup_resultados);

-- =====================================================================
-- 2. VIRADA DE TEMPORADA: zera só os pontos
-- =====================================================================
-- Foto do ranking no momento em que a temporada é encerrada
CREATE TABLE IF NOT EXISTS backup_ranking_temporada (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  encerrada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  perfil_id UUID,
  nome TEXT,
  categoria TEXT,
  pontos INTEGER,
  vitorias INTEGER,
  derrotas INTEGER,
  jogos_realizados INTEGER,
  games_ganhos INTEGER,
  games_perdidos INTEGER,
  saldo_games INTEGER,
  taxa_vitoria FLOAT
);

ALTER TABLE backup_ranking_temporada ENABLE ROW LEVEL SECURITY;

-- Encerra a temporada: guarda o ranking final, arquiva os jogos realizados
-- (deixam de valer pontos, mas seguem na carreira e no H2H) e zera os pontos.
-- Nada é apagado.
CREATE OR REPLACE FUNCTION fn_nova_temporada()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO backup_ranking_temporada (
        perfil_id, nome, categoria, pontos, vitorias, derrotas, jogos_realizados,
        games_ganhos, games_perdidos, saldo_games, taxa_vitoria
    )
    SELECT id, nome, categoria, pontos, vitorias, derrotas, jogos_realizados,
           games_ganhos, games_perdidos, saldo_games, taxa_vitoria
    FROM perfis;

    UPDATE jogos SET arquivado = true WHERE status = 'realizado' AND NOT arquivado;

    UPDATE perfis SET pontos = 0 WHERE pontos <> 0;
END;
$$;

-- Recalculo de estatísticas: vitórias, derrotas e games contam a carreira toda;
-- pontos contam só os jogos da temporada atual (não arquivados).
-- Pontuação igual à do app: vitória 3, derrota 1, derrota por W.O. 0.
CREATE OR REPLACE FUNCTION fn_recalcular_estatisticas_jogador(p_jogador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_vitorias INTEGER := 0;
    v_derrotas INTEGER := 0;
    v_pontos INTEGER := 0;
    v_tj INTEGER := 0;
    v_tjr INTEGER := 0;
    v_gg INTEGER := 0;
    v_gp INTEGER := 0;
    v_taxa FLOAT := 0;
    v_rec RECORD;
    v_set TEXT;
BEGIN
    SELECT COUNT(*) INTO v_tj FROM jogos WHERE jogador1_id = p_jogador_id OR jogador2_id = p_jogador_id;

    FOR v_rec IN
        SELECT r.*, j.jogador1_id, j.jogador2_id, j.arquivado
        FROM resultados r JOIN jogos j ON r.jogo_id = j.id
        WHERE j.jogador1_id = p_jogador_id OR j.jogador2_id = p_jogador_id
    LOOP
        v_tjr := v_tjr + 1;

        IF v_rec.vencedor_id = p_jogador_id THEN
            v_vitorias := v_vitorias + 1;
            IF NOT v_rec.arquivado THEN v_pontos := v_pontos + 3; END IF;
        ELSIF NOT v_rec.arquivado AND NOT COALESCE(v_rec.is_wo, false) THEN
            v_pontos := v_pontos + 1;
        END IF;

        -- Cálculo de Games (Parsing de "6/4" ou "7/6(7-5)")
        IF NOT COALESCE(v_rec.is_wo, false) THEN
            FOREACH v_set IN ARRAY ARRAY[v_rec.placar_set1, v_rec.placar_set2, v_rec.placar_set3] LOOP
                IF v_set LIKE '%/%' THEN
                    -- Descarta o tie-break entre parênteses antes de converter
                    v_set := split_part(v_set, '(', 1);
                    IF v_rec.jogador1_id = p_jogador_id THEN
                        v_gg := v_gg + split_part(v_set, '/', 1)::integer;
                        v_gp := v_gp + split_part(v_set, '/', 2)::integer;
                    ELSE
                        v_gg := v_gg + split_part(v_set, '/', 2)::integer;
                        v_gp := v_gp + split_part(v_set, '/', 1)::integer;
                    END IF;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    v_derrotas := v_tjr - v_vitorias;
    IF v_tjr > 0 THEN v_taxa := (v_vitorias::float / v_tjr::float) * 100; END IF;

    UPDATE perfis SET
        pontos = v_pontos,
        vitorias = v_vitorias, derrotas = v_derrotas,
        jogos_totais = v_tj, jogos_realizados = v_tjr,
        games_ganhos = v_gg, games_perdidos = v_gp,
        saldo_games = v_gg - v_gp, taxa_vitoria = ROUND(v_taxa::numeric, 0)
    WHERE id = p_jogador_id;
END;
$$ LANGUAGE plpgsql;
