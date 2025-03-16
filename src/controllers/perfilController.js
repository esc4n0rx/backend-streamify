import * as perfilService from '../services/perfilService.js';

export const criarPerfil = async (req, res) => {
  const { nome, avatar, pin } = req.body;
  const usuario_id = req.usuario.id;

  const response = await perfilService.criarPerfil({ usuario_id, nome, avatar, pin });
  res.status(response.status).json(response);
};

export const listarPerfis = async (req, res) => {
  const usuario_id = req.usuario.id;
  const response = await perfilService.listarPerfis(usuario_id);
  res.status(response.status).json(response);
};

export const removerPerfil = async (req, res) => {
  const usuario_id = req.usuario.id;
  const perfil_id = req.params.id;

  const response = await perfilService.removerPerfil(usuario_id, perfil_id);
  res.status(response.status).json(response);
};

export const validarPin = async (req, res) => {
  const { pin } = req.body;
  const perfil_id = req.params.id;

  const response = await perfilService.validarPin(perfil_id, pin);
  res.status(response.status).json(response);
};
