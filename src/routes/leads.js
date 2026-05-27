const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/checkPermission');
const c = require('../controllers/leads.controller');

router.get('/', auth, c.listar);
router.get('/exportar', auth, c.exportarCSV);
router.get('/sla-pendentes', auth, c.slaPendentes);
router.post('/verificar-duplicata', auth, c.verificarDuplicata);
router.get('/:id', auth, c.buscarPorId);
router.post('/', auth, c.criar);
router.put('/:id', auth, requirePerfil('super_admin', 'admin_geral', 'gestor_unidade', 'atendente'), c.atualizar);
router.patch('/:id/status', auth, requirePerfil('super_admin', 'admin_geral', 'gestor_unidade', 'atendente'), c.alterarStatus);
router.patch('/:id/responsavel', auth, requirePerfil('super_admin', 'admin_geral', 'gestor_unidade'), c.atribuirResponsavel);
router.post('/:id/observacoes', auth, c.adicionarObservacao);
router.get('/:id/historico', auth, c.listarHistorico);
router.patch('/:id/ia', auth, c.atualizarIA);
router.delete('/:id', auth, requirePerfil('super_admin', 'admin_geral'), c.deletar);

module.exports = router;
