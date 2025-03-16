import express from 'express';
import authRoutes from './routes/authRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import contentAdminRoutes from './routes/contentAdminRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import proxyRoutes from './routes/proxyRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import sinopseRoutes from './routes/sinopse.js';
import perfilRoutes from './routes/perfilRoutes.js';
import watchRoutes from './routes/watchRoutes.js';
import cors from 'cors';

import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'https://streamifyx.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/assets', express.static('assets'));
app.use('/api/favorites', favoriteRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin-content', contentAdminRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/watch', watchRoutes);
app.use('/api', sinopseRoutes);
app.use('/api/perfis', perfilRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
