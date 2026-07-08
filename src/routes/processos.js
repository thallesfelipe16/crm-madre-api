const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/checkPermission');
const c = require('../controllers/processos.controller');

router.get('/', auth, c.listar);
router.post('/', auth, requirePerfil('super_admin', 'admin_geral'), c.criar);
router.put('/:id', auth, requirePerfil('super_admin', 'admin_geral'), c.atualizar);
router.delete('/:id', auth, requirePerfil('super_admin', 'admin_geral'), c.deletar);

module.exports = router;
