import { supabase } from '../config/supabase.js';

export const addToList = async (usuario_id, conteudo_id, nome_lista) => {
  try {
    const { error } = await supabase
      .from('streamify_user_lists')
      .insert([{ usuario_id, conteudo_id, nome_lista }]);

    if (error) {
      console.error('❌ Erro ao adicionar conteúdo à lista:', error.message);
      return { status: 400, error: error.message };
    }

    return { status: 201, message: 'Conteúdo adicionado à lista com sucesso.' };
  } catch (err) {
    console.error('❌ Erro ao adicionar conteúdo à lista:', err.message);
    return { status: 500, error: 'Erro ao adicionar conteúdo à lista.' };
  }
};

export const removeFromList = async (usuario_id, conteudo_id, nome_lista) => {
  try {
    const { error } = await supabase
      .from('streamify_user_lists')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('conteudo_id', conteudo_id)
      .eq('nome_lista', nome_lista);

    if (error) {
      console.error('❌ Erro ao remover conteúdo da lista:', error.message);
      return { status: 400, error: error.message };
    }

    return { status: 200, message: 'Conteúdo removido da lista com sucesso.' };
  } catch (err) {
    console.error('❌ Erro ao remover conteúdo da lista:', err.message);
    return { status: 500, error: 'Erro ao remover conteúdo da lista.' };
  }
};

export const listUserLists = async (usuario_id) => {
  try {
    const { data, error } = await supabase
      .from('streamify_user_lists')
      .select('conteudo_id, nome_lista')
      .eq('usuario_id', usuario_id);

    if (error) {
      console.error('❌ Erro ao buscar listas do usuário:', error.message);
      return { status: 400, error: error.message };
    }

    return { status: 200, data };
  } catch (err) {
    console.error('❌ Erro ao buscar listas do usuário:', err.message);
    return { status: 500, error: 'Erro ao buscar listas do usuário.' };
  }
};
