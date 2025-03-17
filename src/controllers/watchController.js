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
