const PERFIS = {
  super_admin: 5,
  admin_geral: 4,
  gestor_unidade: 3,
  atendente: 2,
  marketing_bi: 1,
  n8n_service: 99,
};

function requirePerfil(...perfisPermitidos) {
  return (req, res, next) => {
    const perfilUsuario = req.user?.perfil;
    if (!perfilUsuario) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    if (perfilUsuario === 'n8n_service') return next();
    if (perfisPermitidos.includes(perfilUsuario)) return next();
    return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
  };
}

function filtrarPorUnidade(req, query, params) {
  const { perfil, unidade_id } = req.user;
  const podeVerTudo = ['super_admin', 'admin_geral', 'marketing_bi', 'n8n_service'].includes(perfil);
  if (!podeVerTudo && unidade_id) {
    params.push(unidade_id);
    query += ` AND l.unidade_id = $${params.length}`;
  }
  return { query, params };
}

module.exports = { requirePerfil, filtrarPorUnidade, PERFIS };
