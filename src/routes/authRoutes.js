import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/profile', authenticateToken, authController.updateProfile);
router.get('/avatars', authController.getAvatars);


export default router;
