import { supabase } from '../config/supabase.js';

export const searchContents = async (req, res) => {
  const termo = req.query.termo;
  if (!termo) {
    return res.status(400).json({ error: 'Termo de busca é obrigatório.' });
  }
  
  try {
    let results = [];
    const isNumeric = /^\d+$/.test(termo); // Verifica se é número inteiro
    
    if (isNumeric) {
      // Busca por ID
      const { data, error } = await supabase
        .from('streamhivex_conteudos')
        .select('id, nome, poster, categoria, subcategoria, url, temporadas, episodios')
        .eq('id', Number(termo));
        
      if (error) throw error;
      results = data || [];
      
      if (results.length > 0 && results[0].subcategoria === 'Serie') {
        // Extrair o nome base da série (removendo S01E17 por exemplo)
        const serieName = results[0].nome.replace(/\s+S\d+E\d+$/i, '').trim();
        
        // Buscar todos os episódios dessa série usando o nome base
        const { data: serieData, error: serieError } = await supabase
          .from('streamhivex_conteudos')
          .select('id, nome, poster, categoria, subcategoria, url, temporadas, episodios')
          .ilike('nome', `${serieName}%`) // Busca pelo nome base
          .eq('subcategoria', 'Serie');
          
        if (serieError) throw serieError;
        
        if (serieData && serieData.length > 0) {
          // Construir a série completa com todas as temporadas
          const serieCompleta = {
            nome: serieName,
            poster: results[0].poster,
            categoria: results[0].categoria,
            subcategoria: 'Serie',
            temporadas: {}
          };
          
          // Organizar todos os episódios por temporada
          serieData.forEach(episodio => {
            const match = episodio.nome.match(/S(\d+)E(\d+)$/i);
            if (match) {
              const season = parseInt(match[1], 10);
              const episode = parseInt(match[2], 10);
              
              if (!serieCompleta.temporadas[season]) {
                serieCompleta.temporadas[season] = [];
              }
              
              serieCompleta.temporadas[season].push({
                episodio: episode,
                url: episodio.url
              });
            }
          });
          
          // Ordenar os episódios em cada temporada
          Object.keys(serieCompleta.temporadas).forEach(season => {
            serieCompleta.temporadas[season].sort((a, b) => a.episodio - b.episodio);
          });
          
          return res.status(200).json({ filmes: [], series: [serieCompleta] });
        }
      } else if (results.length > 0 && results[0].subcategoria === 'Filme') {
        // Para filmes, retornar normalmente
        return res.status(200).json({
          filmes: [{
            nome: results[0].nome,
            poster: results[0].poster,
            categoria: results[0].categoria,
            url: results[0].url,
            subcategoria: 'Filme'
          }],
          series: []
        });
      }
      
      // Se não encontrou ou não é série/filme, retorna vazio
      if (results.length === 0) {
        return res.status(200).json({ filmes: [], series: [] });
      }
    } else {
      // Busca textual
      const { data, error } = await supabase
        .from('streamhivex_conteudos')
        .select('id, nome, poster, categoria, subcategoria, url, temporadas, episodios')
        .or(`nome.ilike.%${termo}%,categoria.ilike.%${termo}%,subcategoria.ilike.%${termo}%`)
        .limit(50);
        
      if (error) throw error;
      results = data || [];
    }
    
    // Processamento de resultados da busca textual
    let filmes = [];
    let seriesGroup = {};
    
    results.forEach(item => {
      if (item.subcategoria === 'Filme') {
        filmes.push({
          nome: item.nome,
          poster: item.poster,
          categoria: item.categoria,
          url: item.url,
          subcategoria: 'Filme'
        });
      } else if (item.subcategoria === 'Serie') {
        const baseName = item.nome.replace(/\s+S\d+E\d+$/i, '').trim();
        
        if (!seriesGroup[baseName]) {
          seriesGroup[baseName] = {
            nome: baseName,
            poster: item.poster,
            categoria: item.categoria,
            subcategoria: 'Serie',
            temporadas: {}
          };
        }
        
        let season, episode;
        const match = item.nome.match(/S(\d+)E(\d+)$/i);
        
        if (match) {
          season = parseInt(match[1], 10);
          episode = parseInt(match[2], 10);
        } else {
          season = item.temporadas || 1;
          episode = item.episodios || 1;
        }
        
        if (!seriesGroup[baseName].temporadas[season]) {
          seriesGroup[baseName].temporadas[season] = [];
        }
        
        seriesGroup[baseName].temporadas[season].push({
          episodio: episode,
          url: item.url
        });
      }
    });
    
    // Ordenar episódios em cada temporada
    Object.values(seriesGroup).forEach(serie => {
      Object.keys(serie.temporadas).forEach(season => {
        serie.temporadas[season].sort((a, b) => a.episodio - b.episodio);
      });
    });
    
    filmes = filmes.slice(0, 5);
    const series = Object.values(seriesGroup).slice(0, 5);
    
    return res.status(200).json({ filmes, series });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    return res.status(500).json({ error: 'Erro ao realizar a busca.' });
  }
};
