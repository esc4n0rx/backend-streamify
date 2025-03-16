import express from 'express';
import * as perfilController from '../controllers/perfilController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/', perfilController.criarPerfil);
router.get('/', perfilController.listarPerfis);
router.delete('/:id', perfilController.removerPerfil);
router.post('/validar-pin/:id', perfilController.validarPin);

export default router;
