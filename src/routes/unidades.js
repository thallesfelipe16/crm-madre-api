const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/checkPermission');
const c = require('../controllers/unidades.controller');

router.get('/', auth, c.listar);
router.get('/:id', auth, c.buscarPorId);
router.post('/', auth, requirePerfil('super_admin'), c.criar);
router.put('/:id', auth, requirePerfil('super_admin', 'admin_geral'), c.atualizar);

module.exports = router;
