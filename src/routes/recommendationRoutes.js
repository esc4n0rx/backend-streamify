import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { recommend } from '../controllers/recommendationController.js';

const router = express.Router();
router.get('/', authenticateToken, recommend);
export default router;
