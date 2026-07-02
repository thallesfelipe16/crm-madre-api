const db = require('../config/db');
const { filtrarPorUnidade } = require('../middleware/checkPermission');

async function registrarHistorico(leadId, evento, descricao, usuarioId) {
  await db.query(
    'INSERT INTO historico_lead (lead_id, evento, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
    [leadId, evento, descricao, usuarioId || null]
  );
}

async function listar(req, res) {
  const { status, unidade_id, responsavel_id, serie, origem, busca, fora_sla, ano, mes, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let params = [];
  let where = 'WHERE 1=1';

  if (status) { params.push(status); where += ` AND l.status_atual = $${params.length}`; }
  if (unidade_id) { params.push(unidade_id); where += ` AND l.unidade_id = $${params.length}`; }
  if (responsavel_id) { params.push(responsavel_id); where += ` AND l.responsavel_id = $${params.length}`; }
  if (serie) { params.push(`%${serie}%`); where += ` AND l.serie_interesse ILIKE $${params.length}`; }
  if (origem) { params.push(origem); where += ` AND l.origem_lead = $${params.length}`; }
  if (ano) { params.push(Number(ano)); where += ` AND EXTRACT(YEAR FROM l.created_at) = $${params.length}`; }
  if (mes) { params.push(Number(mes)); where += ` AND EXTRACT(MONTH FROM l.created_at) = $${params.length}`; }
  if (busca) {
    const buscaVal = `%${busca}%`;
    params.push(buscaVal, buscaVal, buscaVal);
    const p = params.length;
    where += ` AND (l.nome_responsavel ILIKE $${p - 2} OR l.telefone ILIKE $${p - 1} OR l.email ILIKE $${p})`;
  }
  // Leads com SLA vencido: parados em etapas iniciais por mais de 24h
  if (fora_sla === 'true') {
    where += ` AND l.status_atual IN ('novo_lead', 'primeiro_atendimento', 'contato_realizado', 'visita_agendada')`
           + ` AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '24 hours'`;
  }

  const filtrado = filtrarPorUnidade(req, where, params);
  where = filtrado.query;
  params = filtrado.params;

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM leads l ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(Number(limit), offset);
    const { rows } = await db.query(
      `SELECT l.*, u.nome AS unidade_nome, r.nome AS responsavel_nome
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN usuarios r ON l.responsavel_id = r.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ total, pagina: Number(page), leads: rows });
  } catch (err) {
    console.error('Erro ao listar leads:', err);
    return res.status(500).json({ erro: 'Erro ao buscar leads.' });
  }
}

async function buscarPorId(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT l.*, u.nome AS unidade_nome, r.nome AS responsavel_nome
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN usuarios r ON l.responsavel_id = r.id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar lead.' });
  }
}

async function criar(req, res) {
  const {
    nome_responsavel, nome_aluno, telefone, email, idade, serie_interesse,
    unidade_id, escola_origem, origem_lead, campanha, canal,
    utm_source, utm_medium, utm_campaign, consentimento_comunicacao,
    whatsapp_aluno, email_aluno,
  } = req.body;

  if (!nome_responsavel || !telefone || !serie_interesse) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome_responsavel, telefone, serie_interesse.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO leads (
        nome_responsavel, nome_aluno, telefone, email, idade, serie_interesse,
        unidade_id, escola_origem, origem_lead, campanha, canal,
        utm_source, utm_medium, utm_campaign, consentimento_comunicacao,
        whatsapp_aluno, email_aluno, tipo_aluno
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        nome_responsavel, nome_aluno || null, telefone, email || null,
        idade || null, serie_interesse, unidade_id || null, escola_origem || null,
        origem_lead || null, campanha || null, canal || null,
        utm_source || null, utm_medium || null, utm_campaign || null,
        consentimento_comunicacao || false,
        whatsapp_aluno || null, email_aluno || null, req.body.tipo_aluno || null,
      ]
    );

    const lead = rows[0];
    await registrarHistorico(lead.id, 'criacao', `Lead criado via ${req.user.perfil === 'n8n_service' ? 'integração automática' : 'cadastro manual'}.`, req.user.id);

    return res.status(201).json(lead);
  } catch (err) {
    console.error('Erro ao criar lead:', err);
    return res.status(500).json({ erro: 'Erro ao criar lead.' });
  }
}

async function atualizar(req, res) {
  const campos = ['nome_responsavel', 'nome_aluno', 'telefone', 'email', 'idade',
    'serie_interesse', 'unidade_id', 'escola_origem', 'origem_lead', 'campanha', 'canal', 'prioridade', 'ia_classificacao',
    'whatsapp_aluno', 'email_aluno', 'tipo_aluno'];

  const sets = [];
  const params = [];
  campos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      params.push(req.body[campo]);
      sets.push(`${campo} = $${params.length}`);
    }
  });

  if (sets.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });

  params.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });
    await registrarHistorico(rows[0].id, 'edicao', 'Dados do lead atualizados.', req.user.id);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar lead.' });
  }
}

async function alterarStatus(req, res) {
  const { status_atual, motivo_perda } = req.body;
  const statusValidos = ['novo_lead', 'primeiro_atendimento', 'contato_realizado',
    'visita_agendada', 'visita_realizada', 'em_negociacao', 'matricula_concluida', 'perdido'];

  if (!statusValidos.includes(status_atual)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }

  try {
    const atual = await db.query('SELECT status_atual FROM leads WHERE id = $1', [req.params.id]);
    if (!atual.rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });

    const etapaAnterior = atual.rows[0].status_atual;

    // Salva motivo_perda apenas quando status for 'perdido'; limpa quando sair de perdido
    const motivoFinal = status_atual === 'perdido' ? (motivo_perda || null) : null;

    await db.query(
      'UPDATE leads SET status_atual = $1, status_atualizado_em = NOW(), motivo_perda = $2 WHERE id = $3',
      [status_atual, motivoFinal, req.params.id]
    );
    await db.query(
      'INSERT INTO movimentacao_funil (lead_id, etapa_anterior, nova_etapa, usuario_id) VALUES ($1, $2, $3, $4)',
      [req.params.id, etapaAnterior, status_atual, req.user.id]
    );
    const motivoDesc = motivoFinal ? ` Motivo: ${motivoFinal}.` : '';
    await registrarHistorico(req.params.id, 'mudanca_status', `Status alterado de "${etapaAnterior}" para "${status_atual}".${motivoDesc}`, req.user.id);

    return res.json({ mensagem: 'Status atualizado.', etapa_anterior: etapaAnterior, novo_status: status_atual });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao alterar status.' });
  }
}

async function atribuirResponsavel(req, res) {
  const { responsavel_id } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE leads SET responsavel_id = $1 WHERE id = $2 RETURNING *',
      [responsavel_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });
    await registrarHistorico(rows[0].id, 'atribuicao', `Lead atribuído ao responsável.`, req.user.id);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atribuir responsável.' });
  }
}

async function adicionarObservacao(req, res) {
  const { observacao } = req.body;
  if (!observacao) return res.status(400).json({ erro: 'Observação é obrigatória.' });

  try {
    const { rows } = await db.query(
      'INSERT INTO observacoes (lead_id, usuario_id, observacao) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, observacao]
    );
    await registrarHistorico(req.params.id, 'observacao', observacao, req.user.id);
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao adicionar observação.' });
  }
}

async function listarHistorico(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT h.*, u.nome AS usuario_nome
       FROM historico_lead h
       LEFT JOIN usuarios u ON h.usuario_id = u.id
       WHERE h.lead_id = $1
       ORDER BY h.created_at DESC`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
}

async function atualizarIA(req, res) {
  const { score_ia, ia_resumo, ia_classificacao, ia_urgencia, ia_interesse_visita, ia_proximo_passo, ia_status, ia_erro } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leads SET
        score_ia = $1, ia_resumo = $2, ia_classificacao = $3,
        ia_urgencia = $4, ia_interesse_visita = $5, ia_proximo_passo = $6,
        ia_status = $7, ia_erro = $8, ia_processado_at = NOW()
       WHERE id = $9 RETURNING id, ia_status`,
      [score_ia, ia_resumo, ia_classificacao, ia_urgencia, ia_interesse_visita, ia_proximo_passo, ia_status || 'processado', ia_erro || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });
    await registrarHistorico(req.params.id, 'ia_processamento', `IA processou o lead. Status: ${ia_status}.`, null);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar dados da IA.' });
  }
}

async function verificarDuplicata(req, res) {
  const { telefone, email } = req.body;
  if (!telefone && !email) return res.status(400).json({ erro: 'Informe telefone ou e-mail.' });

  try {
    let query = 'SELECT id, nome_responsavel, telefone, email, status_atual FROM leads WHERE';
    const params = [];
    const condicoes = [];

    if (telefone) { params.push(telefone); condicoes.push(`telefone = $${params.length}`); }
    if (email) { params.push(email); condicoes.push(`email = $${params.length}`); }

    const { rows: exatos } = await db.query(
      `SELECT id, nome_responsavel, telefone, email, status_atual FROM leads WHERE ${condicoes.join(' AND ')}`,
      params
    );

    // Busca por qualquer um dos campos
    const { rows: parciais } = await db.query(
      `SELECT id, nome_responsavel, telefone, email, status_atual FROM leads WHERE ${condicoes.join(' OR ')}`,
      params
    );

    const duplicataExata = telefone && email && exatos.length > 0;
    const duplicataParcial = !duplicataExata && parciais.length > 0;

    return res.json({
      duplicata_certa: duplicataExata,
      duplicata_parcial: duplicataParcial,
      leads_encontrados: parciais,
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao verificar duplicata.' });
  }
}

async function slaPendentes(req, res) {
  // Retorna leads parados em etapas iniciais há mais de X horas (padrão 24h)
  const horas = Number(req.query.horas) || 24;
  try {
    const { rows } = await db.query(
      `SELECT
         l.id, l.nome_responsavel, l.nome_aluno, l.telefone, l.email,
         l.serie_interesse, l.status_atual, l.origem_lead,
         l.created_at, l.status_atualizado_em,
         u.nome AS unidade_nome,
         r.nome AS responsavel_nome, r.email AS responsavel_email,
         EXTRACT(EPOCH FROM (NOW() - COALESCE(l.status_atualizado_em, l.created_at))) / 3600 AS horas_parado
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN usuarios r ON l.responsavel_id = r.id
       WHERE l.status_atual IN ('novo_lead', 'primeiro_atendimento', 'contato_realizado', 'visita_agendada')
         AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - ($1 || ' hours')::INTERVAL
       ORDER BY horas_parado DESC`,
      [horas]
    );
    return res.json({ total: rows.length, horas_limite: horas, leads: rows });
  } catch (err) {
    console.error('Erro ao buscar SLA pendentes:', err);
    return res.status(500).json({ erro: 'Erro ao buscar leads com SLA vencido.' });
  }
}

async function exportarCSV(req, res) {
  const { status, unidade_id, serie } = req.query;
  let params = [];
  let where = 'WHERE 1=1';

  if (status) { params.push(status); where += ` AND l.status_atual = $${params.length}`; }
  if (unidade_id) { params.push(unidade_id); where += ` AND l.unidade_id = $${params.length}`; }
  if (serie) { params.push(`%${serie}%`); where += ` AND l.serie_interesse ILIKE $${params.length}`; }

  const filtrado = filtrarPorUnidade(req, where, params);
  where = filtrado.query;
  params = filtrado.params;

  try {
    const { rows } = await db.query(
      `SELECT l.nome_responsavel, l.nome_aluno, l.telefone, l.email, l.idade,
              l.tipo_aluno, l.serie_interesse, u.nome AS unidade, l.status_atual, l.ia_classificacao,
              l.escola_origem, l.whatsapp_aluno, l.email_aluno,
              l.origem_lead, l.campanha, r.nome AS responsavel, l.created_at
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN usuarios r ON l.responsavel_id = r.id
       ${where} ORDER BY l.created_at DESC`,
      params
    );

    const cabecalho = 'Nome Responsável,Nome Aluno,Telefone,Email,Idade,Tipo Aluno,Série,Unidade,Status,Classificação IA,Escola de Origem,WhatsApp Aluno,E-mail Aluno,Origem,Campanha,Responsável,Data Entrada';
    const linhas = rows.map(r =>
      [r.nome_responsavel, r.nome_aluno, r.telefone, r.email, r.idade,
       r.tipo_aluno, r.serie_interesse, r.unidade, r.status_atual, r.ia_classificacao,
       r.escola_origem, r.whatsapp_aluno, r.email_aluno,
       r.origem_lead, r.campanha, r.responsavel, new Date(r.created_at).toLocaleDateString('pt-BR')]
      .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
      .join(',')
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${Date.now()}.csv"`);
    return res.send('﻿' + [cabecalho, ...linhas].join('\n'));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao exportar.' });
  }
}

async function deletar(req, res) {
  const { id } = req.params;
  try {
    // Busca o lead antes de deletar para registrar no histórico
    const { rows } = await db.query('SELECT nome_responsavel FROM leads WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });

    await registrarHistorico(id, 'lead_deletado',
      `Lead "${rows[0].nome_responsavel}" removido permanentemente por ${req.user?.nome || req.user?.email || 'sistema'}.`,
      req.user?.id || null
    );
    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    return res.json({ mensagem: 'Lead removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar lead:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = {
  listar, buscarPorId, criar, atualizar, alterarStatus,
  atribuirResponsavel, adicionarObservacao, listarHistorico,
  atualizarIA, verificarDuplicata, exportarCSV, slaPendentes, deletar,
};
