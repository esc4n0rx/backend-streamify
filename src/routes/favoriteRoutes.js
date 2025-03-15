import express from 'express';
import * as favoriteController from '../controllers/favoriteController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // protege todas as rotas abaixo

router.post('/', favoriteController.addFavorite);
router.delete('/:id', favoriteController.removeFavorite);
router.get('/', favoriteController.listFavorites);

export default router;
