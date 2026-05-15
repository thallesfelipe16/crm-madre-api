const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/auth.controller');

router.post('/login', c.login);
router.post('/logout', auth, c.logout);
router.post('/recuperar-senha', c.recuperarSenha);
router.post('/redefinir-senha', c.redefinirSenha);
router.get('/perfil', auth, c.perfil);

module.exports = router;
