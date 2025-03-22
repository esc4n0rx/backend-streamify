import express from 'express';
import { saveContinueWatching, getContinueWatching } from '../controllers/watchController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/save', authenticateToken, saveContinueWatching);
router.get('/', authenticateToken, getContinueWatching);

export default router;
