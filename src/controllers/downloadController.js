import { supabase } from '../config/supabase.js';
import { proxyVideo } from './proxyController.js';

const MAX_DOWNLOADS_PER_DAY = 5;

export const proxyDownload = async (req, res) => {
  const usuario_id = req.usuario?.id;
  const { conteudo_id, url } = req.query;

  if (!url || !conteudo_id) {
    return res.status(400).json({ error: 'Parâmetros "url" e "conteudo_id" são obrigatórios.' });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('streamify_download_history')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuario_id)
      .gte('data_download', todayStart);

    if (countError) {
      console.error('[Download] Erro ao verificar limite diário:', countError.message);
      return res.status(500).json({ error: 'Erro ao verificar limite diário de downloads.' });
    }

    if (count >= MAX_DOWNLOADS_PER_DAY) {
      return res.status(403).json({ error: 'Limite diário de 5 downloads atingido.' });
    }

    await supabase.from('streamify_download_history').insert([{ usuario_id, conteudo_id }]);

    req.query.url = url;
    proxyVideo(req, res);
  } catch (err) {
    console.error('[Download] Erro interno:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar download.' });
  }
};

export const listUserDownloads = async (req, res) => {
    const usuario_id = req.usuario.id;
  
    try {
      const { data, error } = await supabase
        .from('streamify_download_history')
        .select(`
          id,
          data_download,
          conteudo_id,
          conteudo:streamhivex_conteudos (
            id, nome, poster, url, sinopse, categoria, subcategoria
          )
        `)
        .eq('usuario_id', usuario_id)
        .order('data_download', { ascending: false });
  
      if (error) {
        console.error('[Download] Erro ao buscar downloads do usuário:', error.message);
        return res.status(500).json({ error: 'Erro ao listar downloads do usuário.' });
      }
  
      const downloadsFormatados = data.map((item) => ({
        id: item.conteudo.id,
        nome: item.conteudo.nome,
        poster: item.conteudo.poster,
        url: item.conteudo.url,
        sinopse: item.conteudo.sinopse,
        categoria: item.conteudo.categoria,
        subcategoria: item.conteudo.subcategoria,
        data_download: item.data_download
      }));
  
      return res.status(200).json({ data: downloadsFormatados });
    } catch (err) {
      console.error('[Download] Erro interno na listagem:', err.message);
      return res.status(500).json({ error: 'Erro interno ao listar downloads.' });
    }
  };
