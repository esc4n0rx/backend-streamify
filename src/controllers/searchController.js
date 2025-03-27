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
        // Organiza a série com todas as temporadas e episódios
        const serie = results[0];
        const serieCompleta = {
          nome: serie.nome,
          poster: serie.poster,
          categoria: serie.categoria,
          subcategoria: serie.subcategoria,
          temporadas: {}
        };

        // Adiciona as temporadas e episódios
        const { data: episodiosData, error: episodiosError } = await supabase
          .from('streamhivex_conteudos')
          .select('nome, url, temporadas, episodios')
          .eq('nome', serie.nome) // Nome para pegar todos os episódios dessa série
          .order('nome'); // Ordena para garantir a sequência correta

        if (episodiosError) throw episodiosError;

        episodiosData.forEach(item => {
          const match = item.nome.match(/S(\d+)E(\d+)$/i); // Ex: S01E01
          if (match) {
            const season = parseInt(match[1], 10);
            const episode = parseInt(match[2], 10);

            if (!serieCompleta.temporadas[season]) {
              serieCompleta.temporadas[season] = [];
            }

            serieCompleta.temporadas[season].push({
              episodio: episode,
              url: item.url
            });
          }
        });

        return res.status(200).json({ filmes: [], series: [serieCompleta] });
      }

    } else {
      // Busca textual
      const { data, error } = await supabase
        .from('streamhivex_conteudos')
        .select('nome, poster, categoria, subcategoria, url, temporadas, episodios')
        .or(`nome.ilike.%${termo}%,categoria.ilike.%${termo}%,subcategoria.ilike.%${termo}%`)
        .limit(50);

      if (error) throw error;
      results = data || [];
    }

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

    filmes = filmes.slice(0, 5);
    const series = Object.values(seriesGroup).slice(0, 5);

    return res.status(200).json({ filmes, series });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    return res.status(500).json({ error: 'Erro ao realizar a busca.' });
  }
};
