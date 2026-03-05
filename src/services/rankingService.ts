import { supabase } from './supabase';

export async function recalculateRanking() {
  try {
    // 1. Fetch all players
    const { data: players, error: playersError } = await supabase
      .from('perfis')
      .select('id');

    if (playersError) throw playersError;

    // 2. Initialize stats for all players
    const statsMap: Record<string, any> = {};
    players.forEach(p => {
      statsMap[p.id] = {
        pontos: 0,
        vitorias: 0,
        derrotas: 0,
        jogos_realizados: 0,
        games_ganhos: 0,
        games_perdidos: 0,
        saldo_games: 0,
        taxa_vitoria: 0
      };
    });

    // 3. Fetch all completed games with results
    const { data: games, error: gamesError } = await supabase
      .from('jogos')
      .select(`
        id,
        categoria_evento,
        jogador1_id,
        jogador2_id,
        status,
        resultado:resultados(vencedor_id, placar_set1, placar_set2, placar_set3, is_wo)
      `)
      .eq('status', 'realizado');

    if (gamesError) throw gamesError;

    // 4. Process each game
    games.forEach(game => {
      const res = Array.isArray(game.resultado) ? game.resultado[0] : game.resultado;
      if (!res) return;

      const j1Id = game.jogador1_id;
      const j2Id = game.jogador2_id;
      const vencedorId = res.vencedor_id;
      const perdedorId = vencedorId === j1Id ? j2Id : j1Id;

      // Update basic stats
      if (statsMap[j1Id]) statsMap[j1Id].jogos_realizados++;
      if (statsMap[j2Id]) statsMap[j2Id].jogos_realizados++;
      
      if (statsMap[vencedorId]) statsMap[vencedorId].vitorias++;
      if (statsMap[perdedorId]) statsMap[perdedorId].derrotas++;

      // Points calculation
      // Victory: 3 points
      // Defeat: 1 point
      // WO Defeat: 0 points
      if (statsMap[vencedorId]) {
        statsMap[vencedorId].pontos += 3;
      }
      if (statsMap[perdedorId]) {
        if (!res.is_wo) {
          statsMap[perdedorId].pontos += 1;
        }
        // If it is WO, points remain 0 for this match
      }

      // Games calculation
      if (!res.is_wo) {
        const processSet = (setStr: string | null) => {
          if (!setStr) return { g1: 0, g2: 0 };
          // Format: "6/4" or "6/7(5-7)"
          const mainPart = setStr.split('(')[0];
          const parts = mainPart.split('/');
          return {
            g1: parseInt(parts[0]) || 0,
            g2: parseInt(parts[1]) || 0
          };
        };

        const s1 = processSet(res.placar_set1);
        const s2 = processSet(res.placar_set2);
        const s3 = processSet(res.placar_set3);

        const totalG1 = s1.g1 + s2.g1 + s3.g1;
        const totalG2 = s1.g2 + s2.g2 + s3.g2;

        if (statsMap[j1Id]) {
          statsMap[j1Id].games_ganhos += totalG1;
          statsMap[j1Id].games_perdidos += totalG2;
        }
        if (statsMap[j2Id]) {
          statsMap[j2Id].games_ganhos += totalG2;
          statsMap[j2Id].games_perdidos += totalG1;
        }
      }
    });

    // 5. Finalize stats (saldo and taxa)
    for (const id in statsMap) {
      const s = statsMap[id];
      s.saldo_games = s.games_ganhos - s.games_perdidos;
      s.taxa_vitoria = s.jogos_realizados > 0 
        ? Math.round((s.vitorias / s.jogos_realizados) * 100) 
        : 0;
    }

    // 6. Update all profiles
    const updatePromises = Object.keys(statsMap).map(id => {
      return supabase
        .from('perfis')
        .update(statsMap[id])
        .eq('id', id);
    });

    await Promise.all(updatePromises);
    console.log('Ranking recalculated successfully');
    return { success: true };
  } catch (err) {
    console.error('Error recalculating ranking:', err);
    return { success: false, error: err };
  }
}
