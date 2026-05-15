const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function listar(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.unidade_id,
              un.nome AS unidade_nome, u.created_at, u.last_login_at
       FROM usuarios u
       LEFT JOIN unidades un ON u.unidade_id = un.id
       ORDER BY u.nome`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar usuários.' });
  }
}

async function buscarPorId(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.unidade_id,
              un.nome AS unidade_nome, u.created_at, u.last_login_at
       FROM usuarios u
       LEFT JOIN unidades un ON u.unidade_id = un.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
}

async function criar(req, res) {
  const { nome, email, senha, perfil, unidade_id } = req.body;
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha, perfil.' });
  }

  const perfisValidos = ['super_admin', 'admin_geral', 'gestor_unidade', 'atendente', 'marketing_bi'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido.' });
  }

  try {
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (existe.rows[0]) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil, unidade_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, perfil, status, unidade_id, created_at`,
      [nome, email.toLowerCase().trim(), senha_hash, perfil, unidade_id || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ erro: 'Erro ao criar usuário.' });
  }
}

async function atualizar(req, res) {
  const { nome, email, perfil, unidade_id, status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE usuarios SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        perfil = COALESCE($3, perfil),
        unidade_id = $4,
        status = COALESCE($5, status)
       WHERE id = $6
       RETURNING id, nome, email, perfil, status, unidade_id`,
      [nome, email?.toLowerCase().trim(), perfil, unidade_id || null, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
}

async function inativar(req, res) {
  try {
    const { rows } = await db.query(
      `UPDATE usuarios SET status = 'inativo' WHERE id = $1 RETURNING id, nome, status`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao inativar usuário.' });
  }
}

async function resetarSenha(req, res) {
  const { nova_senha } = req.body;
  if (!nova_senha) return res.status(400).json({ erro: 'Nova senha é obrigatória.' });

  try {
    const hash = await bcrypt.hash(nova_senha, 10);
    const { rows } = await db.query(
      `UPDATE usuarios SET senha_hash = $1 WHERE id = $2 RETURNING id, nome`,
      [hash, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json({ mensagem: 'Senha redefinida com sucesso.', usuario: rows[0].nome });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao redefinir senha.' });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, inativar, resetarSenha };
