import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  // ✅ Permitir pré-flight OPTIONS direto
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // No Content
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Padronize para o restante do backend
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};
