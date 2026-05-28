const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const c = require('../controllers/auth.controller');

// Máx. 5 tentativas de login por IP a cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Máx. 3 solicitações de recuperação de senha por IP a cada hora
const recuperarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas solicitações. Tente novamente em 1 hora.' },
});

router.post('/login', loginLimiter, c.login);
router.post('/logout', auth, c.logout);
router.post('/recuperar-senha', recuperarLimiter, c.recuperarSenha);
router.post('/redefinir-senha', c.redefinirSenha);
router.get('/perfil', auth, c.perfil);

module.exports = router;
