import { supabase } from '../config/supabase.js';

export const addFavorite = async (usuario_id, conteudo_id) => {
  try {
    // Verifica se conteúdo existe
    const { data: conteudo, error: conteudoError } = await supabase
      .from('streamhivex_conteudos')
      .select('*')
      .eq('id', conteudo_id)
      .single();

    if (conteudoError || !conteudo) return { status: 404, error: 'Conteúdo não encontrado' };

    // Verifica se já foi favoritado
    const { data: exists } = await supabase
      .from('streamify_favorites')
      .select('*')
      .eq('usuario_id', usuario_id)
      .eq('conteudo_id', conteudo_id)
      .maybeSingle();

    if (exists) return { status: 400, error: 'Conteúdo já está nos favoritos' };

    // Insere favorito
    const { error } = await supabase.from('streamify_favorites').insert([
      {
        usuario_id,
        conteudo_id
      }
    ]);

    if (error) return { status: 400, error: error.message };

    return { status: 201, message: 'Favorito adicionado com sucesso' };
  } catch (err) {
    return { status: 500, error: 'Erro interno ao favoritar conteúdo' };
  }
};

export const removeFavorite = async (id) => {
  try {
    const { error } = await supabase
      .from('streamify_favorites')
      .delete()
      .eq('id', id);

    if (error) return { status: 400, error: error.message };
    return { status: 200, message: 'Favorito removido com sucesso' };
  } catch (err) {
    return { status: 500, error: 'Erro interno ao remover favorito' };
  }
};

export const listFavorites = async (usuario_id) => {
  try {
    // Primeiro pega todos os favoritos do usuário
    const { data: favoritos, error: favError } = await supabase
      .from('streamify_favorites')
      .select('id, conteudo_id')
      .eq('usuario_id', usuario_id);

    if (favError) return { status: 400, error: favError.message };

    // Para cada conteudo_id, buscar detalhes do conteúdo
    const conteudoIds = favoritos.map(f => f.conteudo_id);

    const { data: conteudos, error: conteudoError } = await supabase
      .from('streamhivex_conteudos')
      .select('*')
      .in('id', conteudoIds);

    if (conteudoError) return { status: 400, error: conteudoError.message };

    return {
      status: 200,
      favoritos: conteudos
    };
  } catch (err) {
    return { status: 500, error: 'Erro ao listar favoritos' };
  }
};
