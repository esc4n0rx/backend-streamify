import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import * as contentController from '../controllers/contentController.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', contentController.listContent);

export default router;
