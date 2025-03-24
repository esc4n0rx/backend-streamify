import { supabase } from '../config/supabase.js';

export const listCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('streamhivex_conteudos')
      .select('categoria');

    if (error) {
      console.error('❌ Erro ao buscar categorias:', error.message);
      return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }

    // Extrair valores únicos de categoria
    const categoriasUnicas = [...new Set(data.map(item => item.categoria).filter(Boolean))];

    return res.status(200).json({ categorias: categoriasUnicas });
  } catch (err) {
    console.error('❌ Erro interno:', err.message);
    return res.status(500).json({ error: 'Erro interno ao listar categorias' });
  }
};
