const db = require('../config/db');
const { filtrarPorUnidade } = require('../middleware/checkPermission');

async function stats(req, res) {
  const { unidade_id } = req.query;

  // Monta filtro de unidade respeitando permissão do usuário
  let where = 'WHERE 1=1';
  let params = [];

  if (unidade_id) {
    params.push(unidade_id);
    where += ` AND l.unidade_id = $${params.length}`;
  }

  const filtrado = filtrarPorUnidade(req, where, params);
  where = filtrado.query;
  params = filtrado.params;

  try {
    // ── KPIs principais ───────────────────────────────────────────
    const kpiResult = await db.query(
      `SELECT
        COUNT(*)                                                                  AS total,
        COUNT(*) FILTER (WHERE l.status_atual = 'matricula_concluida')           AS matriculados,
        COUNT(*) FILTER (WHERE l.status_atual = 'perdido')                       AS perdidos,
        COUNT(*) FILTER (WHERE l.status_atual = 'visita_agendada')               AS visitas_agendadas,
        COUNT(*) FILTER (WHERE l.status_atual NOT IN ('matricula_concluida','perdido')) AS ativos,
        COUNT(*) FILTER (
          WHERE l.status_atual = 'novo_lead'
          AND l.created_at < NOW() - INTERVAL '24 hours'
        )                                                                         AS sem_atendimento,
        COUNT(*) FILTER (
          WHERE l.status_atual IN ('novo_lead','contato_realizado','visita_agendada','fila_espera')
          AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '24 hours'
        )                                                                         AS sla_critico,
        COUNT(*) FILTER (WHERE l.created_at >= NOW() - INTERVAL '30 days')       AS ultimos_30_dias,
        COUNT(*) FILTER (
          WHERE l.status_atual = 'matricula_concluida'
          AND l.status_atualizado_em >= NOW() - INTERVAL '30 days'
        )                                                                         AS matriculas_30_dias
       FROM leads l
       ${where}`,
      params
    );
    const kpi = kpiResult.rows[0];
    const total = parseInt(kpi.total) || 0;
    const matriculados = parseInt(kpi.matriculados) || 0;
    const taxaConversao = total > 0 ? ((matriculados / total) * 100).toFixed(1) : '0.0';

    // ── Distribuição por status ───────────────────────────────────
    const statusResult = await db.query(
      `SELECT l.status_atual, COUNT(*) AS total
       FROM leads l ${where}
       GROUP BY l.status_atual
       ORDER BY total DESC`,
      params
    );

    // ── Leads por unidade ─────────────────────────────────────────
    const unidadeResult = await db.query(
      `SELECT u.nome AS unidade, COUNT(*) AS total
       FROM leads l
       LEFT JOIN unidades u ON u.id = l.unidade_id
       ${where}
       GROUP BY u.nome
       ORDER BY total DESC`,
      params
    );

    // ── Evolução mensal (últimos 12 meses) ────────────────────────
    const mensalResult = await db.query(
      `SELECT
         TO_CHAR(l.created_at, 'Mon') AS mes,
         EXTRACT(MONTH FROM l.created_at)::int AS mes_num,
         EXTRACT(YEAR FROM l.created_at)::int AS ano,
         COUNT(*) AS leads,
         COUNT(*) FILTER (WHERE l.status_atual = 'matricula_concluida') AS matriculas
       FROM leads l
       ${where.replace('WHERE 1=1', "WHERE l.created_at >= NOW() - INTERVAL '12 months'")}
       GROUP BY mes, mes_num, ano
       ORDER BY ano, mes_num`,
      params
    );

    // ── Distribuição por série ────────────────────────────────────
    const serieResult = await db.query(
      `SELECT
         COALESCE(l.serie_interesse, 'Não informado') AS serie,
         COUNT(*) AS total
       FROM leads l ${where} AND l.serie_interesse IS NOT NULL
       GROUP BY l.serie_interesse
       ORDER BY total DESC
       LIMIT 12`,
      params.length > 0 ? params : []
    );

    // ── Temperatura IA ────────────────────────────────────────────
    const tempResult = await db.query(
      `SELECT
         COALESCE(l.ia_classificacao, 'sem classificação') AS classificacao,
         COUNT(*) AS total
       FROM leads l ${where}
       GROUP BY l.ia_classificacao`,
      params
    );

    // ── Motivos de perda ──────────────────────────────────────────
    const perdaResult = await db.query(
      `SELECT
         COALESCE(l.motivo_perda, 'Não informado') AS motivo,
         COUNT(*) AS total
       FROM leads l ${where} AND l.status_atual = 'perdido'
       GROUP BY l.motivo_perda
       ORDER BY total DESC`,
      params
    );

    // ── Leads recentes (últimos 5) ────────────────────────────────
    const recentesResult = await db.query(
      `SELECT l.id, l.nome_responsavel, l.nome_aluno, l.serie_interesse,
              l.status_atual, l.ia_classificacao, l.created_at,
              u.nome AS unidade_nome, r.nome AS responsavel_nome
       FROM leads l
       LEFT JOIN unidades u ON u.id = l.unidade_id
       LEFT JOIN usuarios r ON r.id = l.responsavel_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT 5`,
      params
    );

    res.json({
      kpis: {
        total,
        matriculados,
        perdidos: parseInt(kpi.perdidos) || 0,
        visitas_agendadas: parseInt(kpi.visitas_agendadas) || 0,
        ativos: parseInt(kpi.ativos) || 0,
        sem_atendimento: parseInt(kpi.sem_atendimento) || 0,
        sla_critico: parseInt(kpi.sla_critico) || 0,
        ultimos_30_dias: parseInt(kpi.ultimos_30_dias) || 0,
        matriculas_30_dias: parseInt(kpi.matriculas_30_dias) || 0,
        taxa_conversao: taxaConversao,
      },
      graficos: {
        por_status: statusResult.rows.map(r => ({ status: r.status_atual, total: parseInt(r.total) })),
        por_unidade: unidadeResult.rows.map(r => ({ unidade: r.unidade || 'Não informado', total: parseInt(r.total) })),
        mensal: mensalResult.rows.map(r => ({ mes: r.mes, ano: parseInt(r.ano), leads: parseInt(r.leads), matriculas: parseInt(r.matriculas) })),
        por_serie: serieResult.rows.map(r => ({ serie: r.serie, total: parseInt(r.total) })),
        temperatura: tempResult.rows.map(r => ({ classificacao: r.classificacao, total: parseInt(r.total) })),
        motivos_perda: perdaResult.rows.map(r => ({ motivo: r.motivo, total: parseInt(r.total) })),
      },
      recentes: recentesResult.rows,
    });
  } catch (err) {
    console.error('Erro ao buscar stats do dashboard:', err);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas.' });
  }
}

module.exports = { stats };
