import { supabase } from '../config/supabase.js';

export const searchContents = async (req, res) => {
  const termo = req.query.termo;
  if (!termo) {
    return res.status(400).json({ error: 'Termo de busca é obrigatório.' });
  }

  try {
    const { data: results, error } = await supabase
      .from('streamhivex_conteudos')
      .select('nome, poster, categoria, subcategoria, url, temporadas, episodios')
      .or(`nome.ilike.%${termo}%,categoria.ilike.%${termo}%,subcategoria.ilike.%${termo}%`)
      .limit(50);

    if (error) {
      throw error;
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
