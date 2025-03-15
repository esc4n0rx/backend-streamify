import * as favoriteService from '../services/favoriteService.js';

export const addFavorite = async (req, res) => {
    const usuario_id = req.user.id;
    const { conteudo_id } = req.body;
    const response = await favoriteService.addFavorite(usuario_id, conteudo_id);
    res.status(response.status).json(response);
  };
  
  export const removeFavorite = async (req, res) => {
    const { id } = req.params;
    const response = await favoriteService.removeFavorite(id);
    res.status(response.status).json(response);
  };
  
  export const listFavorites = async (req, res) => {
    const usuario_id = req.user.id;
    const response = await favoriteService.listFavorites(usuario_id);
    res.status(response.status).json(response);
  };