import express from 'express';
import { proxyVideo } from '../controllers/proxy.controller.js';

const router = express.Router();

router.get('/', proxyVideo);

export default router;
