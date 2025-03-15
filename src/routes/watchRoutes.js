import express from 'express';
import { registerWatch } from '../controllers/watchController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authenticateToken, registerWatch);

export default router;
