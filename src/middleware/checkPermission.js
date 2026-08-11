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
  const { perfil, unidade_id, unidade_ids } = req.user;
  const podeVerTudo = ['super_admin', 'admin_geral', 'marketing_bi', 'n8n_service'].includes(perfil);
  if (!podeVerTudo) {
    const ids = Array.isArray(unidade_ids) && unidade_ids.length > 0
      ? unidade_ids
      : (unidade_id ? [unidade_id] : []);
    if (ids.length > 0) {
      params.push(ids);
      query += ` AND l.unidade_id = ANY($${params.length}::uuid[])`;
    }
  }
  return { query, params };
}

module.exports = { requirePerfil, filtrarPorUnidade, PERFIS };
