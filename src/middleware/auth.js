const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Permite acesso via API Key para o n8n
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.N8N_API_KEY) {
    req.user = { perfil: 'n8n_service', id: null };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = authMiddleware;
