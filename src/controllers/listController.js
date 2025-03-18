import * as listService from '../services/listService.js';

export const addToList = async (req, res) => {
  const { usuario_id, conteudo_id, nome_lista } = req.body;

  if (!usuario_id || !conteudo_id || !nome_lista) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
  }

  const response = await listService.addToList(usuario_id, conteudo_id, nome_lista);
  res.status(response.status).json(response);
};

export const removeFromList = async (req, res) => {
  const { usuario_id, conteudo_id, nome_lista } = req.body;

  if (!usuario_id || !conteudo_id || !nome_lista) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
  }

  const response = await listService.removeFromList(usuario_id, conteudo_id, nome_lista);
  res.status(response.status).json(response);
};

export const listUserLists = async (req, res) => {
  const { usuario_id } = req.params;

  if (!usuario_id) {
    return res.status(400).json({ error: 'Usuário não informado.' });
  }

  const response = await listService.listUserLists(usuario_id);
  res.status(response.status).json(response);
};
