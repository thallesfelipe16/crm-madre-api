const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/checkPermission');
const c = require('../controllers/usuarios.controller');

const apenasAdmins = requirePerfil('super_admin', 'admin_geral');

router.get('/stats', auth, apenasAdmins, c.getStats);
router.get('/', auth, apenasAdmins, c.listar);
router.get('/:id', auth, apenasAdmins, c.buscarPorId);
router.post('/', auth, requirePerfil('super_admin'), c.criar);
router.put('/:id', auth, apenasAdmins, c.atualizar);
router.delete('/:id', auth, requirePerfil('super_admin'), c.inativar);
router.patch('/:id/senha', auth, requirePerfil('super_admin', 'admin_geral'), c.resetarSenha);
router.patch('/:id/foto', auth, c.atualizarFoto);

module.exports = router;
