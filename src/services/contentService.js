import { supabase } from '../config/supabase.js';

export const listContent = async () => {
  try {
    const { data: conteudos, error } = await supabase
      .from('streamhivex_conteudos')
      .select('*');

    if (error) return { status: 400, error: error.message };

    const agrupado = {};

    for (const item of conteudos) {
      const categoria = item.categoria || 'Desconhecida';
      const subcategoria = item.subcategoria || 'Outro';

      if (!agrupado[categoria]) agrupado[categoria] = {};
      if (!agrupado[categoria][subcategoria]) agrupado[categoria][subcategoria] = [];

      if (subcategoria.toLowerCase() === 'serie') {
        // Nome ajustado (remove SxxExx e espaços finais)
        const nomeBase = item.nome.replace(/S\d{2}E\d{2}$/i, '').trim();

        // Verifica se essa série já está no array
        const existente = agrupado[categoria][subcategoria].find(s => s.nome === nomeBase);

        const episodio = {
          id: item.id,
          episodio: item.episodios,
          temporada: item.temporadas,
          url: item.url
        };

        if (existente) {
          // Adiciona episódio à série existente
          existente.episodios.push(episodio);
        } else {
          // Nova série
          agrupado[categoria][subcategoria].push({
            nome: nomeBase,
            poster: item.poster, // usa o primeiro episódio
            url: item.url,
            episodios: [episodio]
          });
        }
      } else {
        // Filme
        agrupado[categoria][subcategoria].push({
          id: item.id,
          nome: item.nome,
          poster: item.poster,
          url: item.url
        });
      }
    }

    return { status: 200, data: agrupado };
  } catch (err) {
    return { status: 500, error: 'Erro ao listar conteúdos' };
  }
};


export const addContent = async (data) => {
    try {
      const { error } = await supabase.from('streamhivex_conteudos').insert([data]);
      if (error) return { status: 400, error: error.message };
      return { status: 201, message: 'Conteúdo adicionado com sucesso' };
    } catch (err) {
      return { status: 500, error: 'Erro ao adicionar conteúdo' };
    }
  };
  
  export const updateContent = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('streamhivex_conteudos')
        .update(updates)
        .eq('id', id);
  
      if (error) return { status: 400, error: error.message };
      return { status: 200, message: 'Conteúdo atualizado com sucesso' };
    } catch (err) {
      return { status: 500, error: 'Erro ao atualizar conteúdo' };
    }
  };
  
  export const deleteContent = async (id) => {
    try {
      const { error } = await supabase
        .from('streamhivex_conteudos')
        .delete()
        .eq('id', id);
  
      if (error) return { status: 400, error: error.message };
      return { status: 200, message: 'Conteúdo removido com sucesso' };
    } catch (err) {
      return { status: 500, error: 'Erro ao remover conteúdo' };
    }
  };
