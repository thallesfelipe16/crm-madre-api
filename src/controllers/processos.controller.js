const db = require('../config/db');

async function listar(req, res) {
  try {
    const { rows } = await db.query(`SELECT * FROM processos_matricula ORDER BY ordem ASC, nome ASC`);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar processos.' });
  }
}

async function criar(req, res) {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const { rows } = await db.query(
      `INSERT INTO processos_matricula (nome) VALUES ($1) RETURNING *`,
      [nome.trim()]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar processo.' });
  }
}

async function atualizar(req, res) {
  const { nome, ativo, ordem } = req.body;
  const sets = [];
  const params = [];
  if (nome !== undefined) { params.push(nome.trim()); sets.push(`nome = $${params.length}`); }
  if (ativo !== undefined) { params.push(ativo); sets.push(`ativo = $${params.length}`); }
  if (ordem !== undefined) { params.push(ordem); sets.push(`ordem = $${params.length}`); }
  if (sets.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
  params.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE processos_matricula SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Processo não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar processo.' });
  }
}

async function deletar(req, res) {
  try {
    const uso = await db.query(`SELECT COUNT(*) FROM leads WHERE processo_id = $1`, [req.params.id]);
    if (parseInt(uso.rows[0].count) > 0)
      return res.status(400).json({ erro: 'Processo em uso por leads. Inative-o em vez de excluir.' });
    await db.query(`DELETE FROM processos_matricula WHERE id = $1`, [req.params.id]);
    return res.json({ mensagem: 'Processo excluído.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao excluir processo.' });
  }
}

module.exports = { listar, criar, atualizar, deletar };
