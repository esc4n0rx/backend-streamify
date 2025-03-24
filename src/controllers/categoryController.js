import { supabase } from '../config/supabase.js';

export const listCategories = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_unique_categories');

    if (error) {
      console.error('❌ Erro ao buscar categorias únicas via RPC:', error.message);
      return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }

    return res.status(200).json({ categorias: data });
  } catch (err) {
    console.error('❌ Erro interno:', err.message);
    return res.status(500).json({ error: 'Erro interno ao listar categorias' });
  }
};
