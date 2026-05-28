const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');

const tokensBloqueados = new Set();

async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND status = $2',
      [email.toLowerCase().trim(), 'ativo']
    );

    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    await db.query('UPDATE usuarios SET last_login_at = NOW() WHERE id = $1', [usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil, unidade_id: usuario.unidade_id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        unidade_id: usuario.unidade_id,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function logout(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) tokensBloqueados.add(token);
  return res.json({ mensagem: 'Logout realizado com sucesso.' });
}

async function recuperarSenha(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'E-mail é obrigatório.' });

  try {
    const { rows } = await db.query(
      'SELECT id, nome FROM usuarios WHERE email = $1 AND status = $2',
      [email.toLowerCase().trim(), 'ativo']
    );

    // Sempre retorna sucesso para não revelar se o e-mail existe
    if (!rows[0]) {
      return res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    // Invalida tokens anteriores do mesmo usuário e salva no banco (sobrevive a deploys)
    await db.query('UPDATE tokens_recuperacao SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE', [rows[0].id]);
    await db.query(
      'INSERT INTO tokens_recuperacao (token, usuario_id, expira_em) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
      [token, rows[0].id]
    );

    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    const link = `${process.env.APP_URL}/redefinir-senha?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Redefinição de senha — CRM Madre de Deus',
      html: `<p>Olá, ${rows[0].nome}!</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${link}">${link}</a></p>`,
    });

    return res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
  } catch (err) {
    console.error('Erro ao recuperar senha:', err);
    return res.status(500).json({ erro: 'Erro ao enviar e-mail.' });
  }
}

async function redefinirSenha(req, res) {
  const { token, nova_senha } = req.body;
  if (!token || !nova_senha) {
    return res.status(400).json({ erro: 'Token e nova senha são obrigatórios.' });
  }

  try {
    const { rows: tokenRows } = await db.query(
      'SELECT usuario_id FROM tokens_recuperacao WHERE token = $1 AND usado = FALSE AND expira_em > NOW()',
      [token]
    );
    if (!tokenRows[0]) {
      return res.status(400).json({ erro: 'Token inválido ou expirado.' });
    }

    const hash = await bcrypt.hash(nova_senha, 10);
    await db.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, tokenRows[0].usuario_id]);
    await db.query('UPDATE tokens_recuperacao SET usado = TRUE WHERE token = $1', [token]);
    return res.json({ mensagem: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function perfil(req, res) {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, email, perfil, unidade_id, created_at, last_login_at FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

module.exports = { login, logout, recuperarSenha, redefinirSenha, perfil, tokensBloqueados };
