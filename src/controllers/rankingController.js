import { supabase } from '../config/supabase.js';

export const listTopRanking = async (req, res) => {
  try {
    const categorias = ['AÇÃO', 'ANIMAÇÃO', 'AVENTURA', 'COMÉDIA', 'HERÓIS'];
    const filmesSelecionados = [];

    for (const categoria of categorias) {
      const { data, error } = await supabase
        .from('streamhivex_conteudos')
        .select('id, nome, poster, url, sinopse')
        .eq('subcategoria', 'Filme')
        .ilike('categoria', `%${categoria}%`)
        .not('nome', 'is', null)
        .order('id', { ascending: false }) // Ordem neutra
        .limit(50); // limitamos para não estourar uso gratuito

      if (error) {
        console.error(`❌ Erro ao buscar filmes da categoria ${categoria}:`, error.message);
        continue;
      }

      // Seleciona aleatoriamente 2 filmes da categoria (se disponíveis)
      const escolhidos = data
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .map(item => ({ ...item, categoria }));

      filmesSelecionados.push(...escolhidos);
    }

    // Adiciona posição no ranking conforme a ordem original
    const ranking = filmesSelecionados.map((item, index) => ({
      posicao: index + 1,
      ...item,
    }));

    return res.status(200).json({ ranking });
  } catch (err) {
    console.error('❌ Erro interno ao gerar ranking:', err.message);
    return res.status(500).json({ error: 'Erro interno ao gerar ranking de filmes' });
  }
};
