import { supabase } from '../config/supabase.js';

export const listTopRanking = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('streamhivex_conteudos')
      .select('id, nome, poster, url, sinopse')
      .eq('subcategoria', 'Filme')
      .not('nome', 'is', null)
      .order('random()', { ascending: true }) // seleção aleatória
      .limit(10);

    if (error) {
      console.error('❌ Erro ao buscar ranking:', error.message);
      return res.status(500).json({ error: 'Erro ao buscar ranking dos filmes' });
    }

    // Organiza e adiciona posição
    const ranking = data.map((item, index) => ({
      posicao: index + 1,
      ...item
    }));

    return res.status(200).json({ ranking });
  } catch (err) {
    console.error('❌ Erro interno no ranking:', err.message);
    return res.status(500).json({ error: 'Erro interno ao gerar ranking' });
  }
};
