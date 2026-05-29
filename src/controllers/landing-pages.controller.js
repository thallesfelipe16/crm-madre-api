const db = require('../config/db');

async function listar(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT
        c.*,
        COUNT(l.id)::int                                                              AS total_leads,
        COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::int  AS leads_30_dias,
        COUNT(CASE WHEN l.status_atual = 'matricula_concluida' THEN 1 END)::int       AS matriculas,
        MAX(l.created_at)                                                             AS ultimo_lead_em
      FROM configuracoes_lp c
      LEFT JOIN leads l ON l.campanha = c.campanha
      GROUP BY c.id
      ORDER BY c.nome
    `);
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar LPs:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, url, ativa, campanha } = req.body;
  if (typeof ativa !== 'boolean') {
    return res.status(400).json({ erro: 'Campo ativa deve ser boolean.' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE configuracoes_lp
          SET nome = $1, url = $2, ativa = $3, campanha = $4,
              updated_at = NOW(), updated_by = $5
        WHERE id = $6
        RETURNING *`,
      [nome, url || null, ativa, campanha, req.user.id, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'LP não encontrada.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar LP:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

module.exports = { listar, atualizar };
