-- Migração: arquivar jogos em vez de apagar - FARIA LIMER
-- Rodar UMA vez no SQL Editor do Supabase, ANTES de publicar a nova versão do app.

-- 1. Coluna que marca jogos de temporadas encerradas.
--    Jogos arquivados não contam no ranking, mas continuam aparecendo no H2H (Career).
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false;

-- 2. Recalculo de estatísticas passa a ignorar jogos arquivados
CREATE OR REPLACE FUNCTION fn_recalcular_estatisticas_jogador(p_jogador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_vitorias INTEGER := 0;
    v_derrotas INTEGER := 0;
    v_tj INTEGER := 0;
    v_tjr INTEGER := 0;
    v_gg INTEGER := 0;
    v_gp INTEGER := 0;
    v_taxa FLOAT := 0;
    v_rec RECORD;
    v_set TEXT;
BEGIN
    SELECT COUNT(*) INTO v_tj FROM jogos
    WHERE (jogador1_id = p_jogador_id OR jogador2_id = p_jogador_id) AND NOT arquivado;

    SELECT COUNT(*) INTO v_tjr FROM resultados r JOIN jogos j ON r.jogo_id = j.id
    WHERE (j.jogador1_id = p_jogador_id OR j.jogador2_id = p_jogador_id) AND NOT j.arquivado;

    SELECT COUNT(*) INTO v_vitorias FROM resultados r JOIN jogos j ON r.jogo_id = j.id
    WHERE r.vencedor_id = p_jogador_id AND NOT j.arquivado;

    -- Cálculo de Games (Parsing de "6/4" ou "7/6(7-5)")
    FOR v_rec IN
        SELECT r.*, j.jogador1_id, j.jogador2_id
        FROM resultados r JOIN jogos j ON r.jogo_id = j.id
        WHERE (j.jogador1_id = p_jogador_id OR j.jogador2_id = p_jogador_id) AND NOT j.arquivado
    LOOP
        IF NOT v_rec.is_wo THEN
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
        pontos = (v_vitorias * 10) + (v_derrotas * 4),
        vitorias = v_vitorias, derrotas = v_derrotas,
        jogos_totais = v_tj, jogos_realizados = v_tjr,
        games_ganhos = v_gg, games_perdidos = v_gp,
        saldo_games = v_gg - v_gp, taxa_vitoria = ROUND(v_taxa::numeric, 0)
    WHERE id = p_jogador_id;
END;
$$ LANGUAGE plpgsql;
