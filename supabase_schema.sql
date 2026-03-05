-- Script SQL para o Supabase - FARIA LIMER 2026

-- Tabela de Perfis
CREATE TABLE perfis (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  titulo_clube TEXT UNIQUE NOT NULL, -- Login
  senha_cpf TEXT NOT NULL, -- 4 dígitos
  data_nascimento DATE NOT NULL,
  categoria TEXT CHECK (categoria IN ('Grand Slam', 'ATP 1000', 'ATP 500', 'ATP 250', 'Challenger')) DEFAULT 'Challenger',
  pontos INTEGER DEFAULT 0,
  vitorias INTEGER DEFAULT 0,
  derrotas INTEGER DEFAULT 0,
  jogos_totais INTEGER DEFAULT 0, -- TJ
  jogos_realizados INTEGER DEFAULT 0, -- TJR
  games_ganhos INTEGER DEFAULT 0, -- GG
  games_perdidos INTEGER DEFAULT 0, -- GP
  saldo_games INTEGER DEFAULT 0, -- SG
  taxa_vitoria FLOAT DEFAULT 0, -- Taxa
  avatar_url TEXT,
  nivel_acesso TEXT CHECK (nivel_acesso IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Jogos
CREATE TABLE jogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador1_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
  jogador2_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
  data_jogo TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('agendado', 'realizado')) DEFAULT 'agendado',
  categoria_evento TEXT CHECK (categoria_evento IN ('Grand Slam', 'ATP 1000', 'ATP 500', 'ATP 250', 'Challenger')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Resultados
CREATE TABLE resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jogo_id UUID REFERENCES jogos(id) ON DELETE CASCADE UNIQUE,
  vencedor_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
  is_wo BOOLEAN DEFAULT false,
  placar_set1 TEXT, -- ex: "6/4"
  placar_set2 TEXT,
  placar_set3 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Função para recalcular estatísticas de um jogador
CREATE OR REPLACE FUNCTION fn_recalcular_estatisticas_jogador(p_jogador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_vitorias INTEGER := 0;
    v_derrotas INTEGER := 0;
    v_pontos_vitoria INTEGER := 0;
    v_pontos_derrota INTEGER := 0;
    v_tj INTEGER := 0;
    v_tjr INTEGER := 0;
    v_gg INTEGER := 0;
    v_gp INTEGER := 0;
    v_taxa FLOAT := 0;
    v_rec RECORD;
BEGIN
    -- 1. Total de Jogos (TJ)
    SELECT COUNT(*) INTO v_tj FROM jogos WHERE jogador1_id = p_jogador_id OR jogador2_id = p_jogador_id;

    -- 2. Total de Jogos Realizados (TJR)
    SELECT COUNT(*) INTO v_tjr FROM resultados r JOIN jogos j ON r.jogo_id = j.id 
    WHERE j.jogador1_id = p_jogador_id OR j.jogador2_id = p_jogador_id;

    -- 3. Vitórias e Pontos de Vitória
    SELECT COUNT(*) INTO v_vitorias FROM resultados WHERE vencedor_id = p_jogador_id;
    v_pontos_vitoria := v_vitorias * 10;

    -- 4. Derrotas e Pontos de Derrota
    SELECT 
        COUNT(*),
        SUM(CASE WHEN r.is_wo THEN 0 ELSE 4 END)
    INTO v_derrotas, v_pontos_derrota
    FROM resultados r
    JOIN jogos j ON r.jogo_id = j.id
    WHERE (j.jogador1_id = p_jogador_id OR j.jogador2_id = p_jogador_id)
    AND r.vencedor_id != p_jogador_id;

    -- 5. Games Ganhos (GG) e Games Perdidos (GP)
    FOR v_rec IN 
        SELECT r.*, j.jogador1_id, j.jogador2_id 
        FROM resultados r 
        JOIN jogos j ON r.jogo_id = j.id 
        WHERE j.jogador1_id = p_jogador_id OR j.jogador2_id = p_jogador_id
    LOOP
        IF NOT v_rec.is_wo THEN
            -- Parsing Set 1
            IF v_rec.placar_set1 LIKE '%/%' THEN
                IF v_rec.jogador1_id = p_jogador_id THEN
                    v_gg := v_gg + split_part(v_rec.placar_set1, '/', 1)::integer;
                    v_gp := v_gp + split_part(v_rec.placar_set1, '/', 2)::integer;
                ELSE
                    v_gg := v_gg + split_part(v_rec.placar_set1, '/', 2)::integer;
                    v_gp := v_gp + split_part(v_rec.placar_set1, '/', 1)::integer;
                END IF;
            END IF;
            -- Parsing Set 2
            IF v_rec.placar_set2 LIKE '%/%' THEN
                IF v_rec.jogador1_id = p_jogador_id THEN
                    v_gg := v_gg + split_part(v_rec.placar_set2, '/', 1)::integer;
                    v_gp := v_gp + split_part(v_rec.placar_set2, '/', 2)::integer;
                ELSE
                    v_gg := v_gg + split_part(v_rec.placar_set2, '/', 2)::integer;
                    v_gp := v_gp + split_part(v_rec.placar_set2, '/', 1)::integer;
                END IF;
            END IF;
            -- Parsing Set 3
            IF v_rec.placar_set3 LIKE '%/%' THEN
                IF v_rec.jogador1_id = p_jogador_id THEN
                    v_gg := v_gg + split_part(v_rec.placar_set3, '/', 1)::integer;
                    v_gp := v_gp + split_part(v_rec.placar_set3, '/', 2)::integer;
                ELSE
                    v_gg := v_gg + split_part(v_rec.placar_set3, '/', 2)::integer;
                    v_gp := v_gp + split_part(v_rec.placar_set3, '/', 1)::integer;
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- 6. Taxa de Vitória
    IF v_tjr > 0 THEN
        v_taxa := (v_vitorias::float / v_tjr::float) * 100;
    END IF;

    -- 7. Atualizar o Perfil
    UPDATE perfis
    SET 
        pontos = v_pontos_vitoria + COALESCE(v_pontos_derrota, 0),
        vitorias = v_vitorias,
        derrotas = COALESCE(v_derrotas, 0),
        jogos_totais = v_tj,
        jogos_realizados = v_tjr,
        games_ganhos = v_gg,
        games_perdidos = v_gp,
        saldo_games = v_gg - v_gp,
        taxa_vitoria = ROUND(v_taxa::numeric, 0)
    WHERE id = p_jogador_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar pontos automaticamente
CREATE OR REPLACE FUNCTION tr_atualizar_pontos_resultado()
RETURNS TRIGGER AS $$
DECLARE
    v_jogador1_id UUID;
    v_jogador2_id UUID;
BEGIN
    SELECT jogador1_id, jogador2_id INTO v_jogador1_id, v_jogador2_id
    FROM jogos WHERE id = COALESCE(NEW.jogo_id, OLD.jogo_id);

    PERFORM fn_recalcular_estatisticas_jogador(v_jogador1_id);
    PERFORM fn_recalcular_estatisticas_jogador(v_jogador2_id);

    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE jogos SET status = 'realizado' WHERE id = NEW.jogo_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        UPDATE jogos SET status = 'agendado' WHERE id = OLD.jogo_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_resultado_changes ON resultados;
CREATE TRIGGER tg_resultado_changes
AFTER INSERT OR UPDATE OR DELETE ON resultados
FOR EACH ROW EXECUTE FUNCTION tr_atualizar_pontos_resultado();

-- Habilitar RLS (Row Level Security)
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Perfis visíveis para todos" ON perfis FOR SELECT USING (true);
CREATE POLICY "Usuários podem editar seu próprio perfil" ON perfis FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Jogos visíveis para todos" ON jogos FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar jogos" ON jogos FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND nivel_acesso = 'admin')
);
CREATE POLICY "Resultados visíveis para todos" ON resultados FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar resultados" ON resultados FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND nivel_acesso = 'admin')
);
