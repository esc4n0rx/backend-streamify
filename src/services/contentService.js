import { supabase } from '../config/supabase.js';

export const listContent = async () => {
  try {
    const pageSize = 10000;
    let start = 0;
    let allData = [];
    let finished = false;

    while (!finished) {
      const { data: chunk, error } = await supabase
        .from('streamhivex_conteudos')
        .select('*')
        .range(start, start + pageSize - 1);

      if (error) return { status: 400, error: error.message };

      allData = allData.concat(chunk);
      if (chunk.length < pageSize) finished = true;
      start += pageSize;
    }

    const agrupado = {};

    for (const item of allData) {
      const categoria = item.categoria || 'Desconhecida';
      const subcategoria = item.subcategoria || 'Outro';

      if (!agrupado[categoria]) agrupado[categoria] = {};
      if (!agrupado[categoria][subcategoria]) agrupado[categoria][subcategoria] = [];

      if (subcategoria.toLowerCase() === 'serie') {
        const nomeBase = item.nome.replace(/S\d{2}E\d{2}$/i, '').trim();

        const existente = agrupado[categoria][subcategoria].find(s => s.nome === nomeBase);

        const episodio = {
          id: item.id,
          episodio: item.episodios,
          temporada: item.temporadas,
          url: item.url
        };

        if (existente) {
          existente.episodios.push(episodio);
        } else {
          agrupado[categoria][subcategoria].push({
            nome: nomeBase,
            poster: item.poster,
            url: item.url,
            episodios: [episodio]
          });
        }
      } else {
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
