import { supabase } from '../config/supabase.js';
import fs from 'fs';

let contentCache = null;
let contentCacheTimestamp = null;
const CACHE_DURATION_MS = 1000 * 60 * 30; // 30 minutos

export const listContent = async (categoria = '', subcategoria = '', page = null, limit = null) => {
  try {
    const now = Date.now();
    const isPaginated = page !== null && limit !== null;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    
    // Se não estiver usando paginação, usa a lógica de cache original
    if (!isPaginated && contentCache && contentCacheTimestamp && now - contentCacheTimestamp < CACHE_DURATION_MS) {
      console.log('⚡ Retornando dados do cache (conteúdos)');
      return { status: 200, data: contentCache };
    }
    
    console.log('🔍 ' + (isPaginated ? 'Carregando página de conteúdos' : 'Cache expirado. Carregando conteúdos do banco...'));
    
    // Monta a query para contagem com filtros condicionais
    let countQuery = supabase
      .from('streamhivex_conteudos')
      .select('*', { count: 'exact', head: true });
    if (categoria) countQuery = countQuery.ilike('categoria', `%${categoria}%`);
    if (subcategoria) countQuery = countQuery.ilike('subcategoria', `%${subcategoria}%`);
    
    const { count: totalRegistros, error: countError } = await countQuery;
    
    if (countError || totalRegistros === null) {
      console.error(
        '❌ Erro ao contar registros ou total é nulo:',
        countError ? countError.message : 'Total de registros é nulo'
      );
      return { status: 500, error: 'Erro ao contar registros no banco.' };
    }
    
    console.log(`📊 Total de registros no banco: ${totalRegistros}`);
    
    // Se nenhum registro for encontrado, não atualiza o cache e retorna um objeto consistente
    if (totalRegistros === 0) {
      console.warn('⚠ Nenhum registro encontrado para os filtros fornecidos. Cache não atualizado.');
      return { status: 200, data: {}, pagination: isPaginated ? { total: 0, page: pageNum, limit: limitNum, pages: 0 } : undefined };
    }
    
    // Monta a query para buscar os dados com os filtros aplicados
    let baseQuery = supabase
      .from('streamhivex_conteudos')
      .select('*');
    if (categoria) baseQuery = baseQuery.ilike('categoria', `%${categoria}%`);
    if (subcategoria) baseQuery = baseQuery.ilike('subcategoria', `%${subcategoria}%`);
    
    let allData = [];
    
    if (isPaginated) {
      // Para consultas paginadas, aplicamos limit e offset diretamente
      const { data: paginatedData, error } = await baseQuery
        .range(offset, offset + limitNum - 1)
        .order('id', { ascending: true });
      
      if (error) {
        console.error(`❌ Erro ao carregar página ${pageNum}:`, error.message);
        return { status: 400, error: error.message };
      }
      
      console.log(`📦 Página ${pageNum} carregada: ${paginatedData.length} registros (limit ${limitNum}, offset ${offset})`);
      allData = paginatedData;
      
      // Calcula o número total de páginas
      const totalPages = Math.ceil(totalRegistros / limitNum);
      
      // Para paginação, agrupamos os dados normalmente e adicionamos informações de paginação
      const agrupado = agruparDados(allData);
      
      console.log(`✅ Conteúdos da página ${pageNum} organizados e prontos para envio.`);
      
      return { 
        status: 200, 
        data: agrupado,
        pagination: {
          total: totalRegistros,
          page: pageNum,
          limit: limitNum,
          pages: totalPages
        }
      };
    } else {
      // Lógica original para carregar todos os dados
      const batchSize = 1000;
      let start = 0;
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
        
        if (chunk.length < batchSize) break; // fim antecipado
        start += batchSize;
        tentativa++;
      }
      
      console.log(`✅ Total retornado após batches: ${allData.length}`);
      
      if (allData.length !== totalRegistros) {
        console.warn(`⚠ Diferença no total: esperado ${totalRegistros}, recebido ${allData.length}`);
      }
      
      // Agrupamento dos dados
      const agrupado = agruparDados(allData);
      
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
    }
  } catch (err) {
    console.error('❌ Erro interno ao listar conteúdos:', err.message);
    return { status: 500, error: 'Erro ao listar conteúdos' };
  }
};

// Função auxiliar para agrupar os dados
function agruparDados(allData) {
  const agrupado = {};
  
  for (const item of allData) {
    const categoriaItem = item.categoria || 'Desconhecida';
    const subcategoriaItem = item.subcategoria || 'Outro';
    
    if (!agrupado[categoriaItem]) agrupado[categoriaItem] = {};
    if (!agrupado[categoriaItem][subcategoriaItem]) agrupado[categoriaItem][subcategoriaItem] = [];
    
    if (subcategoriaItem.toLowerCase() === 'serie') {
      // Para séries, agrupa pelo nome base (remove SxxExx no final)
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
  
  return agrupado;
}

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
