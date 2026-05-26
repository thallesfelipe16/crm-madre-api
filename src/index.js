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
  const token = req.query.token || '';
  const apiUrl = (process.env.APP_URL || '') + '/api/auth/redefinir-senha';

  const html = '<!DOCTYPE html>' +
'<html lang="pt-BR"><head>' +
'<meta charset="UTF-8"/>' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
'<title>Redefinir Senha - CRM Madre de Deus</title>' +
'<style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{min-height:100vh;background:#1e3a5f;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:system-ui,sans-serif}' +
'.card{background:#fff;border-radius:1rem;padding:2rem;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3)}' +
'h2{color:#1e3a5f;font-size:1.25rem;font-weight:700;margin-bottom:.25rem}' +
'.sub{color:#6b7280;font-size:.875rem;margin-bottom:1.5rem}' +
'label{display:block;font-size:.8125rem;font-weight:500;color:#374151;margin-bottom:.25rem}' +
'.field{position:relative;margin-bottom:1rem}' +
'input{width:100%;padding:.625rem .75rem;border:1.5px solid #d1d5db;border-radius:.5rem;font-size:.875rem;outline:none}' +
'input:focus{border-color:#1e3a5f}' +
'.btn{width:100%;padding:.75rem;background:#e8882a;color:#fff;border:none;border-radius:.625rem;font-size:.9375rem;font-weight:600;cursor:pointer;margin-top:.5rem}' +
'.btn:disabled{opacity:.6;cursor:not-allowed}' +
'.erro{padding:.75rem;border-radius:.5rem;font-size:.875rem;margin-bottom:1rem;background:#fef2f2;color:#dc2626;border:1px solid #fecaca}' +
'.ok{padding:.75rem;border-radius:.5rem;font-size:.875rem;margin-bottom:1rem;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}' +
'.footer{text-align:center;font-size:.75rem;color:#9ca3af;margin-top:1.5rem}' +
'</style></head><body>' +
'<div class="card">' +
(token
  ? '<h2>Nova senha</h2>' +
    '<p class="sub">Escolha uma nova senha para sua conta.</p>' +
    '<div id="msg"></div>' +
    '<div class="field"><label>Nova senha</label>' +
    '<input type="password" id="nova" placeholder="Minimo 6 caracteres" autocomplete="new-password"/></div>' +
    '<div class="field"><label>Confirmar nova senha</label>' +
    '<input type="password" id="conf" placeholder="Repita a nova senha" autocomplete="new-password"/></div>' +
    '<button class="btn" id="btn" onclick="enviar()">Definir nova senha</button>'
  : '<p class="erro">Link invalido ou expirado. Solicite um novo link de recuperacao.</p>' +
    '<a href="/login" style="color:#1e3a5f;font-size:.875rem">Voltar ao login</a>'
) +
'<p class="footer">CRM Madre de Deus - Gestao de Matriculas</p>' +
'</div>' +
'<script>' +
'var TOKEN = "' + token + '";' +
'var API_URL = "' + apiUrl + '";' +
'function enviar() {' +
'  var nova = document.getElementById("nova").value;' +
'  var conf = document.getElementById("conf").value;' +
'  var msg = document.getElementById("msg");' +
'  if (nova.length < 6) { msg.innerHTML = "<div class=\\"erro\\">A senha deve ter ao menos 6 caracteres.</div>"; return; }' +
'  if (nova !== conf) { msg.innerHTML = "<div class=\\"erro\\">As senhas nao conferem.</div>"; return; }' +
'  var btn = document.getElementById("btn");' +
'  btn.disabled = true; btn.textContent = "Salvando...";' +
'  var xhr = new XMLHttpRequest();' +
'  xhr.open("POST", API_URL);' +
'  xhr.setRequestHeader("Content-Type", "application/json");' +
'  xhr.onload = function() {' +
'    var d = JSON.parse(xhr.responseText);' +
'    if (xhr.status === 200) {' +
'      document.querySelector(".card").innerHTML = "<div class=\\"ok\\">Senha redefinida com sucesso!</div><a href=\\"/login\\" class=\\"btn\\" style=\\"display:block;text-align:center;text-decoration:none;margin-top:.5rem\\">Ir para o login</a>";' +
'    } else {' +
'      msg.innerHTML = "<div class=\\"erro\\">" + (d.erro || "Erro ao redefinir.") + "</div>";' +
'      btn.disabled = false; btn.textContent = "Definir nova senha";' +
'    }' +
'  };' +
'  xhr.onerror = function() {' +
'    msg.innerHTML = "<div class=\\"erro\\">Erro de conexao. Tente novamente.</div>";' +
'    btn.disabled = false; btn.textContent = "Definir nova senha";' +
'  };' +
'  xhr.send(JSON.stringify({ token: TOKEN, nova_senha: nova }));' +
'}' +
'</script></body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
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
