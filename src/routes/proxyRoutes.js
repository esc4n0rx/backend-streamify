import express from 'express';
import { proxyVideo } from '../controllers/proxyController.js';

const router = express.Router();

router.get('/', proxyVideo);

export default router;
