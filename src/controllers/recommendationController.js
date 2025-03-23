import * as recommendationService from '../services/recommendationService.js';

export const recommend = async (req, res) => {
  const usuario_id = req.usuario.id;
  const response = await recommendationService.getRecommendations(usuario_id);
  res.status(response.status).json(response);
};
