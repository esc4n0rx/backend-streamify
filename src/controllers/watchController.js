import { supabase } from '../config/supabase.js';

export const registerWatch = async (req, res) => {
  const usuario_id = req.usuario.id;
  const { conteudo_id } = req.body;

  if (!conteudo_id) {
    return res.status(400).json({ error: 'conteudo_id é obrigatório.' });
  }

  try {
    const { error } = await supabase
      .from('streamify_watch_history')
      .insert([{ usuario_id, conteudo_id }]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ message: 'Assistido registrado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao registrar conteúdo assistido.' });
  }
};

export const saveContinueWatching = async (req, res) => {
  const usuario_id = req.usuario.id;
  const { conteudo_id, timestamp, temporada, episodio } = req.body;

  if (!conteudo_id || timestamp === undefined) {
    return res.status(400).json({ error: 'conteudo_id e timestamp são obrigatórios.' });
  }

  try {
    const payload = {
      usuario_id,
      conteudo_id,
      timestamp,
      temporada: temporada || null,
      episodio: episodio || null
    };

    const { error } = await supabase
      .from('streamify_continue_watching')
      .upsert([payload], { onConflict: ['usuario_id', 'conteudo_id'] });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ message: 'Progresso salvo com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar progresso.' });
  }
};

export const getContinueWatching = async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const { data, error } = await supabase
      .from('streamify_continue_watching')
      .select('conteudo_id, timestamp, temporada, episodio, streamhivex_conteudos(id, nome, poster, url, sinopse, subcategoria)')
      .eq('usuario_id', usuario_id)
      .order('updated_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    const result = data.map(item => ({
      id: item.conteudo_id,
      nome: item.streamhivex_conteudos?.nome,
      poster: item.streamhivex_conteudos?.poster,
      url: item.streamhivex_conteudos?.url,
      sinopse: item.streamhivex_conteudos?.sinopse,
      subcategoria: item.streamhivex_conteudos?.subcategoria,
      timestamp: item.timestamp,
      temporada: item.temporada,
      episodio: item.episodio
    }));

    return res.status(200).json({ data: result });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar conteúdos assistidos.' });
  }
};


