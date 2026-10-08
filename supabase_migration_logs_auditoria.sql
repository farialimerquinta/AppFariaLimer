-- Migração: logs de auditoria (quem lançou, o que mudou, erros) - FARIA LIMER
-- Rodar UMA vez no SQL Editor do Supabase, ANTES de publicar a nova versão do app.
-- Requer supabase_migration_backup_e_temporada.sql já aplicado.

-- =====================================================================
-- 1. QUEM LANÇOU O PLACAR
-- =====================================================================
-- O login do app é validado pela tabela perfis, então o banco nem sempre sabe
-- quem está logado (auth.uid() vem vazio). O app passa a gravar o nome aqui.
ALTER TABLE resultados ADD COLUMN IF NOT EXISTS lancado_por TEXT;
ALTER TABLE backup_resultados ADD COLUMN IF NOT EXISTS usuario_nome TEXT;

CREATE OR REPLACE FUNCTION fn_backup_resultado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res resultados%ROWTYPE;
    v_usuario_nome TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN v_res := OLD; ELSE v_res := NEW; END IF;

    SELECT nome INTO v_usuario_nome FROM perfis WHERE id = auth.uid();
    -- Na exclusão, lancado_por é de quem lançou o placar, não de quem apagou
    IF v_usuario_nome IS NULL AND TG_OP <> 'DELETE' THEN
        v_usuario_nome := v_res.lancado_por;
    END IF;

    INSERT INTO backup_resultados (
        operacao, usuario_id, usuario_nome, resultado_id, jogo_id, data_jogo, categoria_evento,
        jogador1_id, jogador1_nome, jogador2_id, jogador2_nome,
        vencedor_id, vencedor_nome, is_wo, placar_set1, placar_set2, placar_set3
    )
    SELECT
        TG_OP, auth.uid(), v_usuario_nome, v_res.id, v_res.jogo_id, j.data_jogo, j.categoria_evento,
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

-- =====================================================================
-- 2. LOG AUTOMÁTICO COM O QUE MUDOU (antes e depois)
-- =====================================================================
ALTER TABLE logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Garante que o app consegue gravar logs mesmo sem sessão no Supabase Auth
DROP POLICY IF EXISTS "App pode registrar logs" ON logs;
CREATE POLICY "App pode registrar logs" ON logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Substitui o log genérico ("Alteração automática...") por um que guarda os
-- valores antes e depois. A senha nunca é gravada, só o fato de ter mudado.
-- Atualizações de perfis que só mexem em pontos/estatísticas são ignoradas,
-- porque o recálculo do ranking toca todos os jogadores a cada placar.
CREATE OR REPLACE FUNCTION registrar_log_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_nome TEXT;
    v_antes JSONB;
    v_depois JSONB;
    v_ref JSONB;
    v_mud_antes JSONB := '{}'::jsonb;
    v_mud_depois JSONB := '{}'::jsonb;
    v_campos TEXT[] := ARRAY[]::TEXT[];
    v_campo TEXT;
    v_alvo TEXT;
    v_acao TEXT;
    v_metadata JSONB;
    v_estatisticas TEXT[] := ARRAY['pontos','vitorias','derrotas','jogos_totais','jogos_realizados',
                                   'games_ganhos','games_perdidos','saldo_games','taxa_vitoria'];
BEGIN
    -- Um problema no log nunca pode impedir a operação original
    BEGIN
        IF TG_OP <> 'INSERT' THEN v_antes := to_jsonb(OLD); END IF;
        IF TG_OP <> 'DELETE' THEN v_depois := to_jsonb(NEW); END IF;
        v_ref := COALESCE(v_depois, v_antes);

        IF TG_OP = 'UPDATE' THEN
            FOR v_campo IN SELECT jsonb_object_keys(v_depois) LOOP
                IF v_antes -> v_campo IS DISTINCT FROM v_depois -> v_campo THEN
                    IF TG_TABLE_NAME = 'perfis' AND v_campo = ANY (v_estatisticas) THEN
                        CONTINUE;
                    END IF;
                    v_campos := v_campos || v_campo;
                    IF v_campo = 'senha_cpf' THEN
                        v_mud_depois := v_mud_depois || jsonb_build_object(v_campo, '(alterada)');
                    ELSE
                        v_mud_antes := v_mud_antes || jsonb_build_object(v_campo, v_antes -> v_campo);
                        v_mud_depois := v_mud_depois || jsonb_build_object(v_campo, v_depois -> v_campo);
                    END IF;
                END IF;
            END LOOP;

            IF array_length(v_campos, 1) IS NULL THEN
                RETURN COALESCE(NEW, OLD);
            END IF;
        END IF;

        -- Nome legível do registro afetado
        IF TG_TABLE_NAME = 'perfis' THEN
            v_alvo := v_ref ->> 'nome';
        ELSIF TG_TABLE_NAME = 'jogos' THEN
            SELECT p1.nome || ' vs ' || p2.nome INTO v_alvo
            FROM perfis p1, perfis p2
            WHERE p1.id = (v_ref ->> 'jogador1_id')::uuid AND p2.id = (v_ref ->> 'jogador2_id')::uuid;
        ELSIF TG_TABLE_NAME = 'resultados' THEN
            SELECT p1.nome || ' vs ' || p2.nome INTO v_alvo
            FROM jogos j JOIN perfis p1 ON p1.id = j.jogador1_id JOIN perfis p2 ON p2.id = j.jogador2_id
            WHERE j.id = (v_ref ->> 'jogo_id')::uuid;
        END IF;

        SELECT nome INTO v_usuario_nome FROM perfis WHERE id = auth.uid();
        IF v_usuario_nome IS NULL AND TG_OP <> 'DELETE' THEN
            v_usuario_nome := v_ref ->> 'lancado_por';
        END IF;

        v_acao := 'Banco: ' || CASE TG_OP WHEN 'INSERT' THEN 'inclusão' WHEN 'UPDATE' THEN 'alteração' ELSE 'exclusão' END
                  || ' em ' || TG_TABLE_NAME;

        v_metadata := jsonb_build_object('tabela', TG_TABLE_NAME, 'registro_id', v_ref ->> 'id');
        IF TG_OP = 'UPDATE' THEN
            v_metadata := v_metadata || jsonb_build_object('antes', v_mud_antes, 'depois', v_mud_depois);
        ELSIF TG_OP = 'INSERT' THEN
            v_metadata := v_metadata || jsonb_build_object('depois', v_depois - 'senha_cpf');
        ELSE
            v_metadata := v_metadata || jsonb_build_object('antes', v_antes - 'senha_cpf');
        END IF;

        INSERT INTO logs (usuario_id, usuario_nome, acao, detalhes, metadata)
        VALUES (
            auth.uid(),
            COALESCE(v_usuario_nome, 'Sistema (banco)'),
            v_acao,
            COALESCE(v_alvo, 'Registro ' || COALESCE(v_ref ->> 'id', '?'))
                || CASE WHEN TG_OP = 'UPDATE' THEN ' - campos alterados: ' || array_to_string(v_campos, ', ') ELSE '' END,
            v_metadata
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Placares também passam a gerar log automático (perfis e jogos já geravam)
DROP TRIGGER IF EXISTS tr_log_resultados ON resultados;
CREATE TRIGGER tr_log_resultados
AFTER INSERT OR UPDATE OR DELETE ON resultados
FOR EACH ROW EXECUTE FUNCTION registrar_log_automatico();

-- =====================================================================
-- 3. CONFERÊNCIA: colunas e políticas da tabela logs
-- =====================================================================
SELECT 'coluna' AS tipo, column_name AS nome, data_type || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END AS detalhe
FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logs'
UNION ALL
SELECT 'politica', policyname, cmd || ' para ' || array_to_string(roles, ',')
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'logs'
UNION ALL
SELECT 'rls', relname, CASE WHEN relrowsecurity THEN 'ligado' ELSE 'desligado' END
FROM pg_class WHERE oid = 'public.logs'::regclass;
