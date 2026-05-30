const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/checkPermission');
const c = require('../controllers/landing-pages.controller');

const apenasSuper = requirePerfil('super_admin');

router.get('/', auth, apenasSuper, c.listar);
router.get('/analytics', auth, apenasSuper, c.analytics);
router.get('/:id/publico', c.buscarPublico); // sem auth — consultado pelo n8n
router.put('/:id', auth, apenasSuper, c.atualizar);

module.exports = router;
