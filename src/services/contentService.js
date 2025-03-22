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
    
    // Para promover consistência, mantemos o cache apenas quando não há nenhum filtro
    const usarCache = !isPaginated && !categoria && !subcategoria && 
                     contentCache && contentCacheTimestamp && 
                     now - contentCacheTimestamp < CACHE_DURATION_MS;
    
    if (usarCache) {
      console.log('⚡ Retornando dados do cache (conteúdos)');
      return { status: 200, data: contentCache };
    }
    
    console.log('🔍 ' + (isPaginated ? 'Carregando página de conteúdos' : 'Carregando conteúdos do banco...'));
    console.log(`Filtros: ${categoria ? 'categoria='+categoria : ''} ${subcategoria ? 'subcategoria='+subcategoria : ''}`);
    
    // Monta a query base com filtros condicionais
    let baseQuery = supabase.from('streamhivex_conteudos').select('*');
    
    // Aplicação de filtros - verifica se parâmetros têm conteúdo antes de aplicar
    if (categoria) baseQuery = baseQuery.ilike('categoria', `%${categoria}%`);
    if (subcategoria) baseQuery = baseQuery.ilike('subcategoria', `%${subcategoria}%`);
    
    // Contagem total com os mesmos filtros
    const { count: totalRegistros, error: countError } = await baseQuery.count();
    
    if (countError) {
      console.error('❌ Erro ao contar registros:', countError.message);
      return { status: 500, error: 'Erro ao contar registros no banco.' };
    }
    
    console.log(`📊 Total de registros no banco com filtros aplicados: ${totalRegistros}`);
    
    // Se nenhum registro for encontrado, retorna um objeto consistente
    if (totalRegistros === 0) {
      console.warn('⚠ Nenhum registro encontrado para os filtros fornecidos.');
      return { 
        status: 200, 
        data: {}, 
        pagination: isPaginated ? { total: 0, page: pageNum, limit: limitNum, pages: 0 } : undefined,
        filters: { categoria, subcategoria }
      };
    }
    
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
      
      console.log(`📦 Página ${pageNum} carregada: ${paginatedData.length} registros`);
      allData = paginatedData;
      
      // Calcula o número total de páginas
      const totalPages = Math.ceil(totalRegistros / limitNum);
      
      // Agrupamos os dados e adicionamos informações de paginação
      const agrupado = agruparDados(allData, !!subcategoria);
      
      console.log(`✅ Conteúdos da página ${pageNum} organizados e prontos para envio.`);
      
      return { 
        status: 200, 
        data: agrupado,
        pagination: {
          total: totalRegistros,
          page: pageNum,
          limit: limitNum,
          pages: totalPages
        },
        filters: { categoria, subcategoria }
      };
    } else {
      // Lógica para carregar todos os dados
      const batchSize = 1000;
      let start = 0;
      let tentativa = 1;
      
      // Otimização: se o total for pequeno, carregamos tudo de uma vez
      if (totalRegistros <= batchSize) {
        const { data, error } = await baseQuery.order('id', { ascending: true });
        
        if (error) {
          console.error('❌ Erro ao carregar dados:', error.message);
          return { status: 400, error: error.message };
        }
        
        allData = data;
        console.log(`📦 Dados carregados em uma única chamada: ${allData.length} registros`);
      } else {
        // Carregamento em lotes para grandes volumes
        while (start < totalRegistros) {
          const end = Math.min(start + batchSize - 1, totalRegistros - 1);
          const { data: chunk, error } = await baseQuery
            .range(start, end)
            .order('id', { ascending: true });
          
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
      }
      
      console.log(`✅ Total carregado: ${allData.length} registros`);
      
      // Agrupamento dos dados - passamos flag para comportamento especial quando filtramos só por subcategoria
      const apenasSubcategoria = !categoria && subcategoria;
      const agrupado = agruparDados(allData, apenasSubcategoria);
      
      // Atualiza o cache apenas se não houver filtros
      if (!categoria && !subcategoria) {
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
      }
      
      console.log('✅ Conteúdos organizados e prontos para envio.');
      return { 
        status: 200, 
        data: agrupado,
        filters: { categoria, subcategoria }
      };
    }
  } catch (err) {
    console.error('❌ Erro interno ao listar conteúdos:', err.message, err.stack);
    return { status: 500, error: 'Erro ao listar conteúdos' };
  }
};

// Função auxiliar para agrupar os dados
function agruparDados(allData, filtroEspecial = false) {
  // Se estamos filtrando apenas por subcategoria, usamos uma organização mais plana
  if (filtroEspecial) {
    let resultado = {};
    
    // Agrupamento especial para Serie quando solicitado explicitamente
    const isSerie = allData.length > 0 && 
                    allData[0].subcategoria && 
                    allData[0].subcategoria.toLowerCase() === 'serie';
    
    if (isSerie) {
      // Mapa para organizar séries pelo nome base
      const seriesMap = new Map();
      
      for (const item of allData) {
        // Remove SxxExx no final do nome para agrupar
        const nomeBase = item.nome.replace(/S\d{2}E\d{2}$/i, '').trim();
        
        if (!seriesMap.has(nomeBase)) {
          seriesMap.set(nomeBase, {
            nome: nomeBase,
            poster: item.poster,
            url: item.url,
            sinopse: item.sinopse || 'Descrição não fornecida',
            episodios: []
          });
        }
        
        seriesMap.get(nomeBase).episodios.push({
          id: item.id,
          episodio: item.episodios,
          temporada: item.temporadas,
          url: item.url,
          nome: item.nome
        });
      }
      
      // Converte o mapa para o formato de resposta
      resultado = Array.from(seriesMap.values());
      
      // Organiza episódios por temporada e número
      for (const serie of resultado) {
        serie.episodios.sort((a, b) => {
          if (a.temporada !== b.temporada) {
            return parseInt(a.temporada) - parseInt(b.temporada);
          }
          return parseInt(a.episodio) - parseInt(b.episodio);
        });
      }
      
      // Organiza séries por ordem alfabética
      resultado.sort((a, b) => a.nome.localeCompare(b.nome));
      
      return resultado;
    } else {
      // Para outros tipos de subcategoria, apenas retorna a lista plana
      return allData.map(item => ({
        id: item.id,
        nome: item.nome,
        poster: item.poster,
        url: item.url,
        sinopse: item.sinopse || 'Descrição não fornecida'
      }));
    }
  }
  
  // Comportamento padrão: agrupamento por categoria/subcategoria
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
        url: item.url,
        nome: item.nome
      };
      
      if (existente) {
        existente.episodios.push(episodio);
        
        // Organiza episódios por temporada e número
        existente.episodios.sort((a, b) => {
          if (a.temporada !== b.temporada) {
            return parseInt(a.temporada) - parseInt(b.temporada);
          }
          return parseInt(a.episodio) - parseInt(b.episodio);
        });
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
    
    // Invalidar o cache após modificação
    contentCache = null;
    contentCacheTimestamp = null;
    
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
    
    // Invalidar o cache após modificação
    contentCache = null;
    contentCacheTimestamp = null;
    
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
    
    // Invalidar o cache após modificação
    contentCache = null;
    contentCacheTimestamp = null;
    
    return { status: 200, message: 'Conteúdo removido com sucesso' };
  } catch (err) {
    return { status: 500, error: 'Erro ao remover conteúdo' };
  }
};
