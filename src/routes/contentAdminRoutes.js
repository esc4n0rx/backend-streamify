import express from 'express';
import * as contentController from '../controllers/contentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeAdmin } from '../middlewares/authorizeAdmin.js';

const router = express.Router();

router.use(authenticateToken, authorizeAdmin); // dupla proteção

router.post('/', contentController.addContent);
router.put('/:id', contentController.updateContent);
router.delete('/:id', contentController.deleteContent);

export default router;
