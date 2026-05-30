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

async function buscarPublico(req, res) {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, ativa FROM configuracoes_lp WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'LP não encontrada.' });
    return res.json({ id: rows[0].id, nome: rows[0].nome, ativa: rows[0].ativa });
  } catch (err) {
    console.error('Erro ao buscar LP pública:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

async function analytics(req, res) {
  const anoParam = req.query.ano ? parseInt(req.query.ano) : null;

  try {
    // Anos disponíveis com dados
    const { rows: anosRows } = await db.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM l.created_at)::int AS ano
      FROM leads l
      INNER JOIN configuracoes_lp c ON l.campanha = c.campanha
      ORDER BY ano DESC
    `);

    const anos_disponiveis = anosRows.map(r => r.ano);
    const anoFiltro = anoParam || anos_disponiveis[0] || new Date().getFullYear();

    // Dados mensais por LP para o ano selecionado
    const { rows: dadosMensais } = await db.query(`
      SELECT
        c.id          AS lp_id,
        c.nome        AS lp_nome,
        c.campanha,
        EXTRACT(MONTH FROM l.created_at)::int AS mes,
        COUNT(l.id)::int AS total_leads,
        COUNT(CASE WHEN l.status_atual = 'matricula_concluida' THEN 1 END)::int AS matriculas
      FROM configuracoes_lp c
      INNER JOIN leads l ON l.campanha = c.campanha
      WHERE EXTRACT(YEAR FROM l.created_at) = $1
      GROUP BY c.id, c.nome, c.campanha, EXTRACT(MONTH FROM l.created_at)
      ORDER BY mes, c.nome
    `, [anoFiltro]);

    // Totais anuais por LP
    const { rows: totaisAnuais } = await db.query(`
      SELECT
        c.id          AS lp_id,
        c.nome        AS lp_nome,
        c.campanha,
        COUNT(l.id)::int AS total_leads,
        COUNT(CASE WHEN l.status_atual = 'matricula_concluida' THEN 1 END)::int AS matriculas,
        COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::int AS leads_30_dias
      FROM configuracoes_lp c
      INNER JOIN leads l ON l.campanha = c.campanha
      WHERE EXTRACT(YEAR FROM l.created_at) = $1
      GROUP BY c.id, c.nome, c.campanha
      ORDER BY c.nome
    `, [anoFiltro]);

    return res.json({
      anos_disponiveis,
      ano: anoFiltro,
      dados_mensais: dadosMensais,
      totais_anuais: totaisAnuais,
    });
  } catch (err) {
    console.error('Erro ao buscar analytics de LPs:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

module.exports = { listar, atualizar, buscarPublico, analytics };
