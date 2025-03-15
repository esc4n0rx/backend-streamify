export const authorizeAdmin = (req, res, next) => {
    const systemId = process.env.SYSTEM_ID_USER;
    const userIdFromToken = req.user?.id;
  
    if (userIdFromToken !== systemId) {
      return res.status(403).json({ error: 'Acesso negado: apenas usuário autorizado pode realizar esta ação.' });
    }
  
    next();
  };
  