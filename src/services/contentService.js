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

    // Inicializa a query para buscar conteúdos
    let query = supabase.from('streamhivex_conteudos').select('*');

    // Adiciona os filtros de categoria e subcategoria
    if (categoria) query = query.ilike('categoria', `%${categoria}%`);
    if (subcategoria) query = query.ilike('subcategoria', `%${subcategoria}%`);

    // Adicionando log para depuração
    console.log("🔎 Executando consulta para contar registros com filtros: categoria =", categoria, ", subcategoria =", subcategoria);

    // Obter o total de registros
    const { count: totalRegistros, error: countError } = await query;
    if (countError || totalRegistros === null) {
      console.error('❌ Erro ao contar registros ou total é nulo:', countError ? countError.message : 'Total de registros é nulo');
      return { status: 500, error: 'Erro ao contar registros no banco.' };
    }

    console.log(`📊 Total de registros no banco: ${totalRegistros}`);

    const batchSize = 1000;
    let start = 0;
    let allData = [];
    let tentativa = 1;

    while (start < totalRegistros) {
      const end = Math.min(start + batchSize - 1, totalRegistros - 1);

      const { data: chunk, error } = await query.range(start, end);

      if (error) {
        console.error(`❌ Erro ao carregar bloco ${tentativa}:`, error.message);
        return { status: 400, error: error.message };
      }

      console.log(`📦 Bloco ${tentativa} carregado: ${chunk.length} registros (range ${start}-${end})`);
      allData = allData.concat(chunk);
      if (chunk.length < batchSize) break; // fim antecipado
      start += batchSize;
      tentativa++;
    }

    console.log(`✅ Total retornado após batches: ${allData.length}`);
    if (allData.length !== totalRegistros) {
      console.warn(`⚠ Diferença no total: esperado ${totalRegistros}, recebido ${allData.length}`);
    }

    // Agrupamento
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
            sinopse: item.sinopse || 'Descrição não fornecida',
            episodios: [episodio]
          });
        }
      } else {
        agrupado[categoria][subcategoria].push({
          id: item.id,
          nome: item.nome,
          poster: item.poster,
          url: item.url,
          sinopse: item.sinopse || 'Descrição não fornecida'
        });
      }
    }

    // Salva em cache em memória
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
