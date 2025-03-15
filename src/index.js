import express from 'express';
import authRoutes from './routes/authRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import contentAdminRoutes from './routes/contentAdminRoutes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const proxyRoutes = require('./routes/proxyRoutes');

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/assets', express.static('assets'));
app.use('/api/favorites', favoriteRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin-content', contentAdminRoutes);
app.use('/api/proxy', proxyRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
