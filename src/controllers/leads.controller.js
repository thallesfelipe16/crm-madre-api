const db = require('../config/db');
const { filtrarPorUnidade } = require('../middleware/checkPermission');

async function registrarHistorico(leadId, evento, descricao, usuarioId) {
  await db.query(
    'INSERT INTO historico_lead (lead_id, evento, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
    [leadId, evento, descricao, usuarioId || null]
  );
}

async function listar(req, res) {
  const { status, unidade_id, responsavel_id, serie, origem, busca, fora_sla, ano, mes, processo_id, page = 1, limit = 50 } = req.query;
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
  if (processo_id) { params.push(Number(processo_id)); where += ` AND l.processo_id = $${params.length}`; }
  if (busca) {
    const buscaVal = `%${busca}%`;
    params.push(buscaVal, buscaVal, buscaVal);
    const p = params.length;
    where += ` AND (l.nome_responsavel ILIKE $${p - 2} OR l.telefone ILIKE $${p - 1} OR l.email ILIKE $${p})`;
  }
  // Leads com SLA vencido: parados em etapas iniciais por mais de 24h
  if (fora_sla === 'true') {
    where += ` AND l.status_atual IN ('novo_lead', 'contato_realizado', 'visita_agendada', 'fila_espera')`
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
      `SELECT l.*, u.nome AS unidade_nome, r.nome AS responsavel_nome, p.nome AS processo_nome
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN usuarios r ON l.responsavel_id = r.id
       LEFT JOIN processos_matricula p ON l.processo_id = p.id
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
    const lead = rows[0];
    const { rows: alunos } = await db.query(
      'SELECT id, nome, data_nascimento, serie_interesse, tipo_aluno FROM lead_alunos WHERE lead_id = $1 ORDER BY id',
      [lead.id]
    );
    lead.alunos = alunos;

    // Retorna todos os leads vinculados (mesma família/pai)
    const raizId = lead.vinculo_lead_id || lead.id;
    const { rows: vinculados } = await db.query(
      `SELECT l.id, l.unidade_id, u.nome AS unidade_nome, l.status_atual,
              la.nome AS primeiro_aluno, la.serie_interesse AS primeiro_aluno_serie
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN LATERAL (SELECT nome, serie_interesse FROM lead_alunos WHERE lead_id = l.id ORDER BY id LIMIT 1) la ON true
       WHERE (l.vinculo_lead_id = $1 OR l.id = $1) AND l.id != $2`,
      [raizId, lead.id]
    );
    lead.vinculados = vinculados;

    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar lead.' });
  }
}

async function criar(req, res) {
  const {
    nome_responsavel, nome_aluno, telefone, email, data_nascimento_aluno, idade, serie_interesse,
    unidade_id, escola_origem, origem_lead, campanha, canal,
    utm_source, utm_medium, utm_campaign, consentimento_comunicacao,
    whatsapp_aluno, email_aluno, temperatura, processo_id, como_conheceu,
    responsavel_2_nome, responsavel_2_telefone, responsavel_2_email,
    tipo_aluno, alunos, vinculo_lead_id,
    edital_aceito, necessidade_especial, adaptacoes,
    cpf_responsavel, endereco, cep,
  } = req.body;

  if (!nome_responsavel || !telefone) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome_responsavel, telefone.' });
  }

  // Aceita alunos[] (novo frontend) ou campos legados (n8n)
  const alunosArr = Array.isArray(alunos) && alunos.length > 0 ? alunos : null;
  const serieInteresse = alunosArr
    ? (alunosArr[0]?.serie_interesse || serie_interesse || null)
    : (serie_interesse || null);

  if (!serieInteresse) {
    return res.status(400).json({ erro: 'Série de Interesse é obrigatória.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO leads (
        nome_responsavel, nome_aluno, telefone, email, data_nascimento_aluno, idade, serie_interesse,
        unidade_id, escola_origem, origem_lead, campanha, canal,
        utm_source, utm_medium, utm_campaign, consentimento_comunicacao,
        whatsapp_aluno, email_aluno, tipo_aluno, temperatura, processo_id, como_conheceu,
        responsavel_2_nome, responsavel_2_telefone, responsavel_2_email, vinculo_lead_id,
        edital_aceito, necessidade_especial, adaptacoes,
        cpf_responsavel, endereco, cep
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
      RETURNING *`,
      [
        nome_responsavel,
        alunosArr ? (alunosArr[0]?.nome || null) : (nome_aluno || null),
        telefone, email || null,
        alunosArr ? (alunosArr[0]?.data_nascimento || null) : (data_nascimento_aluno || null),
        idade || null, serieInteresse, unidade_id || null, escola_origem || null,
        origem_lead || null, campanha || null, canal || null,
        utm_source || null, utm_medium || null, utm_campaign || null,
        consentimento_comunicacao || false,
        whatsapp_aluno || null, email_aluno || null,
        alunosArr ? (alunosArr[0]?.tipo_aluno || null) : (tipo_aluno || null),
        temperatura || null, processo_id || null, como_conheceu || null,
        responsavel_2_nome || null, responsavel_2_telefone || null, responsavel_2_email || null,
        vinculo_lead_id || null,
        edital_aceito != null ? Boolean(edital_aceito) : null,
        necessidade_especial || null,
        adaptacoes || null,
        cpf_responsavel || null,
        endereco || null,
        cep || null,
      ]
    );

    const lead = rows[0];

    // Cria entradas em lead_alunos
    const alunosParaCriar = alunosArr || (
      (nome_aluno || serieInteresse) ? [{ nome: nome_aluno || null, data_nascimento: data_nascimento_aluno || null, serie_interesse: serieInteresse, tipo_aluno: tipo_aluno || null }] : []
    );
    for (const a of alunosParaCriar) {
      if (a.nome || a.serie_interesse) {
        await db.query(
          'INSERT INTO lead_alunos (lead_id, nome, data_nascimento, serie_interesse, tipo_aluno) VALUES ($1,$2,$3,$4,$5)',
          [lead.id, a.nome || null, a.data_nascimento || null, a.serie_interesse || null, a.tipo_aluno || null]
        );
      }
    }

    await registrarHistorico(lead.id, 'criacao', `Lead criado via ${req.user.perfil === 'n8n_service' ? 'integração automática' : 'cadastro manual'}.`, req.user.id);
    return res.status(201).json(lead);
  } catch (err) {
    console.error('Erro ao criar lead:', err);
    return res.status(500).json({ erro: 'Erro ao criar lead.' });
  }
}

async function atualizar(req, res) {
  const campos = ['nome_responsavel', 'nome_aluno', 'telefone', 'email', 'data_nascimento_aluno', 'idade',
    'serie_interesse', 'unidade_id', 'escola_origem', 'origem_lead', 'campanha', 'canal', 'ia_classificacao',
    'whatsapp_aluno', 'email_aluno', 'tipo_aluno', 'temperatura', 'processo_id', 'como_conheceu',
    'responsavel_2_nome', 'responsavel_2_telefone', 'responsavel_2_email',
    'edital_aceito', 'necessidade_especial', 'adaptacoes',
    'cpf_responsavel', 'endereco', 'cep'];

  const sets = [];
  const params = [];
  campos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      let val = req.body[campo];
      if (['processo_id', 'idade'].includes(campo)) {
        val = val !== '' && val !== null && val !== undefined ? parseInt(val, 10) : null;
        if (isNaN(val)) val = null;
      } else if (['ia_classificacao', 'temperatura', 'data_nascimento_aluno', 'email', 'email_aluno', 'whatsapp_aluno',
                  'responsavel_2_nome', 'responsavel_2_telefone', 'responsavel_2_email'].includes(campo) && val === '') {
        val = null;
      }
      params.push(val);
      sets.push(`${campo} = $${params.length}`);
    }
  });

  const alunos = Array.isArray(req.body.alunos) ? req.body.alunos : null;

  // Se alunos fornecidos, mantém serie_interesse no lead sincronizado com o primeiro aluno
  if (alunos && alunos.length > 0 && req.body.serie_interesse === undefined) {
    const primeirasSerie = alunos[0]?.serie_interesse || null;
    if (primeirasSerie) {
      params.push(primeirasSerie);
      sets.push(`serie_interesse = $${params.length}`);
    }
  }

  if (sets.length === 0 && !alunos) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });

  try {
    if (sets.length > 0) {
      params.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });
    } else {
      const exists = await db.query('SELECT id FROM leads WHERE id = $1', [req.params.id]);
      if (!exists.rows[0]) return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    if (alunos) {
      await db.query('DELETE FROM lead_alunos WHERE lead_id = $1', [req.params.id]);
      for (const a of alunos) {
        if (a.nome || a.serie_interesse) {
          await db.query(
            'INSERT INTO lead_alunos (lead_id, nome, data_nascimento, serie_interesse, tipo_aluno) VALUES ($1,$2,$3,$4,$5)',
            [req.params.id, a.nome || null, a.data_nascimento || null, a.serie_interesse || null, a.tipo_aluno || null]
          );
        }
      }
    }

    await registrarHistorico(req.params.id, 'edicao', 'Dados do lead atualizados.', req.user.id);
    const { rows: updRows } = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    return res.json(updRows[0]);
  } catch (err) {
    console.error('Erro ao atualizar lead:', err.message);
    return res.status(500).json({ erro: 'Erro ao atualizar lead.' });
  }
}

async function alterarStatus(req, res) {
  const { status_atual, motivo_perda } = req.body;
  const statusValidos = ['novo_lead', 'contato_realizado',
    'visita_agendada', 'visita_realizada', 'em_negociacao', 'fila_espera', 'matricula_concluida', 'reprovado', 'perdido'];

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
  try {
    const { rows } = await db.query(
      `SELECT
         l.id, l.nome_responsavel, l.nome_aluno, l.telefone, l.email,
         l.serie_interesse, l.status_atual, l.origem_lead,
         l.created_at, l.status_atualizado_em,
         u.nome AS unidade_nome,
         r.nome AS responsavel_nome, r.email AS responsavel_email,
         EXTRACT(EPOCH FROM (NOW() - COALESCE(l.status_atualizado_em, l.created_at))) / 3600 AS horas_parado,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('email', at.email, 'nome', at.nome))
           FILTER (WHERE at.email IS NOT NULL), '[]'
         ) AS atendentes_unidade
       FROM leads l
       LEFT JOIN unidades u ON l.unidade_id = u.id
       LEFT JOIN usuarios r ON l.responsavel_id = r.id
       LEFT JOIN usuario_unidades uu ON uu.unidade_id = l.unidade_id
       LEFT JOIN usuarios at ON at.id = uu.usuario_id AND at.status = 'ativo'
         AND at.perfil IN ('atendente', 'gestor_unidade')
       WHERE (
         (l.status_atual = 'novo_lead'          AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '24 hours') OR
         (l.status_atual = 'contato_realizado'  AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '48 hours') OR
         (l.status_atual = 'visita_agendada'    AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '48 hours') OR
         (l.status_atual = 'visita_realizada'   AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '72 hours') OR
         (l.status_atual = 'em_negociacao'      AND COALESCE(l.status_atualizado_em, l.created_at) < NOW() - INTERVAL '120 hours')
       )
       GROUP BY l.id, u.nome, r.nome, r.email
       ORDER BY horas_parado DESC`
    );
    return res.json({ total: rows.length, leads: rows });
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
