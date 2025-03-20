import { supabase } from '../config/supabase.js';
import fs from 'fs';

let contentCache = null;
let contentCacheTimestamp = null;
const CACHE_DURATION_MS = 1000 * 60 * 30; // 30 minutos

export const listContent = async (categoria = '', subcategoria = '') => {
  try {
    const now = Date.now();
    if (contentCache && contentCacheTimestamp && now - contentCacheTimestamp < CACHE_DURATION_MS) {
      console.log('⚡ Retornando dados do cache (conteúdos)');
      return { status: 200, data: contentCache };
    }
    console.log('🔍 Cache expirado. Carregando conteúdos do banco...');

    // Realiza a query para obter apenas a contagem dos registros com os filtros aplicados
    const { count: totalRegistros, error: countError } = await supabase
      .from('streamhivex_conteudos')
      .select('*', { count: 'exact', head: true })
      .ilike('categoria', `%${categoria}%`)
      .ilike('subcategoria', `%${subcategoria}%`);

    if (countError || totalRegistros === null) {
      console.error(
        '❌ Erro ao contar registros ou total é nulo:',
        countError ? countError.message : 'Total de registros é nulo'
      );
      return { status: 500, error: 'Erro ao contar registros no banco.' };
    }
    console.log(`📊 Total de registros no banco: ${totalRegistros}`);

    // Query separada para buscar os dados (sem o head: true)
    let baseQuery = supabase
      .from('streamhivex_conteudos')
      .select('*')
      .ilike('categoria', `%${categoria}%`)
      .ilike('subcategoria', `%${subcategoria}%`);

    const batchSize = 1000;
    let start = 0;
    let allData = [];
    let tentativa = 1;

    while (start < totalRegistros) {
      const end = Math.min(start + batchSize - 1, totalRegistros - 1);
      const { data: chunk, error } = await baseQuery.range(start, end);
      if (error) {
        console.error(`❌ Erro ao carregar bloco ${tentativa}:`, error.message);
        return { status: 400, error: error.message };
      }
      console.log(`📦 Bloco ${tentativa} carregado: ${chunk.length} registros (range ${start}-${end})`);
      allData = allData.concat(chunk);
      if (chunk.length < batchSize) break; // Fim antecipado
      start += batchSize;
      tentativa++;
    }
    console.log(`✅ Total retornado após batches: ${allData.length}`);
    if (allData.length !== totalRegistros) {
      console.warn(`⚠ Diferença no total: esperado ${totalRegistros}, recebido ${allData.length}`);
    }

    // Agrupamento dos dados
    const agrupado = {};
    for (const item of allData) {
      const categoriaItem = item.categoria || 'Desconhecida';
      const subcategoriaItem = item.subcategoria || 'Outro';

      if (!agrupado[categoriaItem]) agrupado[categoriaItem] = {};
      if (!agrupado[categoriaItem][subcategoriaItem]) agrupado[categoriaItem][subcategoriaItem] = [];

      if (subcategoriaItem.toLowerCase() === 'serie') {
        // Agrupa séries com base no nome base
        const nomeBase = item.nome.replace(/S\d{2}E\d{2}$/i, '').trim();
        const existente = agrupado[categoriaItem][subcategoriaItem].find(s => s.nome === nomeBase);

        const episodio = {
          id: item.id,
          episodio: item.episodios,
          temporada: item.temporadas,
          url: item.url
        };

        if (existente) {
          existente.episodios.push(episodio);
        } else {
          agrupado[categoriaItem][subcategoriaItem].push({
            nome: nomeBase,
            poster: item.poster,
            url: item.url,
            sinopse: item.sinopse || 'Descrição não fornecida',
            episodios: [episodio]
          });
        }
      } else {
        agrupado[categoriaItem][subcategoriaItem].push({
          id: item.id,
          nome: item.nome,
          poster: item.poster,
          url: item.url,
          sinopse: item.sinopse || 'Descrição não fornecida'
        });
      }
    }

    // Atualiza o cache em memória e salva em arquivo
    contentCache = agrupado;
    contentCacheTimestamp = Date.now();
    try {
      const cacheDir = './cache';
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(`${cacheDir}/content.json`, JSON.stringify(agrupado, null, 2));
      console.log('💾 Cache salvo também em ./cache/content.json');
    } catch (err) {
      console.warn('⚠ Não foi possível salvar cache local em arquivo:', err.message);
    }
    console.log('✅ Conteúdos organizados, cache atualizado e prontos para envio.');
    return { status: 200, data: agrupado };
  } catch (err) {
    console.error('❌ Erro interno ao listar conteúdos:', err.message);
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