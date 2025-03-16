// routes/sinopse.js
import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import * as sinopseController from '../controllers/sinopseController.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/sinopse', sinopseController.buscarSinopse);

export default router;
