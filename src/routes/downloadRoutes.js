import express from 'express';
import { proxyDownload, listUserDownloads } from '../controllers/downloadController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, proxyDownload);
router.get('/meus', authenticateToken, listUserDownloads);

export default router;
