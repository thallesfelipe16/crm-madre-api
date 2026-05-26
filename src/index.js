require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/db');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const usuariosRoutes = require('./routes/usuarios');
const unidadesRoutes = require('./routes/unidades');

const app = express();

// Aumenta limite para aceitar foto de perfil em base64
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', versao: '1.0.2', build: 'relatorio-stats-fix' }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/unidades', unidadesRoutes);

// Migração automática — adiciona colunas novas sem quebrar instâncias existentes
async function runMigrations() {
  try {
    await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT`);
    // Permite leads sem unidade (ex: LP Pre College antes de campus definido)
    await db.query(`ALTER TABLE leads ALTER COLUMN unidade_id DROP NOT NULL`);
    // Campos do estudante para LP Pre College
    await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_aluno VARCHAR(20)`);
    await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_aluno VARCHAR(255)`);
    console.log('Migrações aplicadas com sucesso.');
  } catch (err) {
    console.error('Erro nas migrações:', err.message);
  }
}
runMigrations();

// Página standalone de redefinição de senha (backend serve direto, sem depender do frontend)
app.get('/redefinir-senha', (req, res) => {
  const apiBase = process.env.APP_URL ? `${process.env.APP_URL}/api` : '/api';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Redefinir Senha — CRM Madre de Deus</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:#1e3a5f;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:system-ui,sans-serif}
    .card{background:#fff;border-radius:1rem;padding:2rem;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
    h2{color:#1e3a5f;font-size:1.25rem;font-weight:700;margin-bottom:.25rem}
    p.sub{color:#6b7280;font-size:.875rem;margin-bottom:1.5rem}
    label{display:block;font-size:.8125rem;font-weight:500;color:#374151;margin-bottom:.25rem}
    .field{position:relative;margin-bottom:1rem}
    input[type=password],input[type=text]{width:100%;padding:.625rem .75rem;border:1.5px solid #d1d5db;border-radius:.5rem;font-size:.875rem;outline:none;transition:border-color .2s}
    input:focus{border-color:#1e3a5f}
    .eye{position:absolute;right:.75rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:1rem;line-height:1}
    .btn{width:100%;padding:.75rem;background:#e8882a;color:#fff;border:none;border-radius:.625rem;font-size:.9375rem;font-weight:600;cursor:pointer;margin-top:.5rem;transition:opacity .2s}
    .btn:hover{opacity:.9}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .msg{padding:.75rem;border-radius:.5rem;font-size:.875rem;margin-bottom:1rem}
    .msg.erro{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
    .msg.ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
    .footer{text-align:center;font-size:.75rem;color:#9ca3af;margin-top:1.5rem}
    .success-icon{font-size:3rem;text-align:center;margin-bottom:1rem}
    a.back{display:inline-flex;align-items:center;gap:.25rem;font-size:.8125rem;color:#1e3a5f;text-decoration:none;margin-bottom:1.25rem;opacity:.7}
    a.back:hover{opacity:1}
  </style>
</head>
<body>
<div class="card" id="app"></div>
<script>
const token = new URLSearchParams(location.search).get('token');
const app = document.getElementById('app');
const API = '${apiBase}';

function render(html){ app.innerHTML = html; }

function pageInvalid(){
  render(\`
    <p style="color:#dc2626;font-size:.875rem;margin-bottom:1rem">Link inválido ou expirado. Solicite um novo link de recuperação.</p>
    <a href="/login" style="color:#1e3a5f;font-size:.875rem">← Voltar ao login</a>
    <div class="footer">CRM Madre de Deus — Gestão de Matrículas</div>
  \`);
}

function pageSuccess(){
  render(\`
    <div class="success-icon">✅</div>
    <h2 style="text-align:center;margin-bottom:.5rem">Senha redefinida!</h2>
    <p class="sub" style="text-align:center">Sua senha foi alterada com sucesso.</p>
    <a href="/login" class="btn" style="display:block;text-align:center;text-decoration:none;padding:.75rem">Ir para o login</a>
    <div class="footer">CRM Madre de Deus — Gestão de Matrículas</div>
  \`);
}

function pageForm(){
  render(\`
    <a href="/login" class="back">← Voltar ao login</a>
    <h2>Nova senha</h2>
    <p class="sub">Escolha uma nova senha para sua conta.</p>
    <div id="msg"></div>
    <div class="field">
      <label>Nova senha</label>
      <input type="password" id="nova" placeholder="Mínimo 6 caracteres" autocomplete="new-password"/>
      <button class="eye" type="button" onclick="toggle('nova')">👁</button>
    </div>
    <div class="field">
      <label>Confirmar nova senha</label>
      <input type="password" id="conf" placeholder="Repita a nova senha" autocomplete="new-password"/>
      <button class="eye" type="button" onclick="toggle('conf')">👁</button>
    </div>
    <button class="btn" id="btn" onclick="submit()">Definir nova senha</button>
    <div class="footer">CRM Madre de Deus — Gestão de Matrículas</div>
  \`);
}

function toggle(id){
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function setMsg(txt, tipo){
  document.getElementById('msg').innerHTML = \`<div class="msg \${tipo}">\${txt}</div>\`;
}

async function submit(){
  const nova = document.getElementById('nova').value;
  const conf = document.getElementById('conf').value;
  if(nova.length < 6) return setMsg('A senha deve ter ao menos 6 caracteres.','erro');
  if(nova !== conf) return setMsg('As senhas não conferem.','erro');
  const btn = document.getElementById('btn');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try{
    const r = await fetch(API+'/auth/redefinir-senha',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token,nova_senha:nova})
    });
    const d = await r.json();
    if(!r.ok) throw new Error(d.erro||'Erro desconhecido');
    pageSuccess();
  }catch(e){
    btn.disabled=false; btn.textContent='Definir nova senha';
    setMsg(e.message||'Erro ao redefinir senha.','erro');
  }
}

if(!token) pageInvalid(); else pageForm();
</script>
</body>
</html>`);
});

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRM Madre API rodando na porta ${PORT}`);
});
