import { supabase } from '../config/supabase.js';

export const listContent = async () => {
  try {
    console.log('🔍 Iniciando carregamento de conteúdos via RPC...');

    // 1. Obter total de registros (opcional, apenas para log)
    const { count: totalRegistros, error: countError } = await supabase
      .from('streamhivex_conteudos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar registros:', countError.message);
      return { status: 500, error: 'Erro ao contar registros no banco.' };
    }

    console.log(`📊 Total de registros no banco: ${totalRegistros}`);

    // 2. Chamar função RPC
    const { data: allData, error: rpcError } = await supabase.rpc('select_all_contents');

    if (rpcError) {
      console.error('❌ Erro ao executar select_all_contents:', rpcError.message);
      return { status: 500, error: 'Erro ao carregar conteúdos via RPC' };
    }

    console.log(`✅ Total retornado via RPC: ${allData.length}`);

    if (allData.length !== totalRegistros) {
      console.warn(`⚠ Diferença no total: esperado ${totalRegistros}, recebido ${allData.length}`);
    }

    // 3. Agrupamento
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

    console.log('✅ Conteúdos organizados e prontos para envio.');
    return { status: 200, data: agrupado };

  } catch (err) {
    console.error('❌ Erro interno ao listar conteúdos via RPC:', err.message);
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
