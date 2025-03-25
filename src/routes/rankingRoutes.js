import express from 'express';
import { listTopRanking } from '../controllers/rankingController.js';

const router = express.Router();

router.get('/', listTopRanking); // GET /api/ranking

export default router;
