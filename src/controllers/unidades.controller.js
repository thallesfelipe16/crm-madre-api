const db = require('../config/db');

async function listar(req, res) {
  try {
    const { rows } = await db.query('SELECT * FROM unidades ORDER BY nome');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar unidades.' });
  }
}

async function buscarPorId(req, res) {
  try {
    const { rows } = await db.query('SELECT * FROM unidades WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Unidade não encontrada.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar unidade.' });
  }
}

async function criar(req, res) {
  const { nome, endereco_resumido } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const { rows } = await db.query(
      'INSERT INTO unidades (nome, endereco_resumido) VALUES ($1, $2) RETURNING *',
      [nome, endereco_resumido || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar unidade.' });
  }
}

async function atualizar(req, res) {
  const { nome, endereco_resumido, status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE unidades SET
        nome = COALESCE($1, nome),
        endereco_resumido = COALESCE($2, endereco_resumido),
        status = COALESCE($3, status)
       WHERE id = $4 RETURNING *`,
      [nome, endereco_resumido, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Unidade não encontrada.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar unidade.' });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar };
