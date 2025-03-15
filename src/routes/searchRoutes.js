import express from 'express';
import { searchContents } from '../controllers/searchController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, searchContents);

export default router;
