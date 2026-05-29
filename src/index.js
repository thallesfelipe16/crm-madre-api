require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/db');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const usuariosRoutes = require('./routes/usuarios');
const unidadesRoutes = require('./routes/unidades');
const landingPagesRoutes = require('./routes/landing-pages');

const app = express();

// Aumenta limite para aceitar foto de perfil em base64
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(helmet());

// CORS: origens permitidas via env var (separadas por vírgula) ou lista padrão
const origensPermitidas = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:4173',
      'http://localhost:5173',
      'https://crm-madre.arcorastudio.com.br',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: n8n, Postman, apps mobile)
    if (!origin) return callback(null, true);
    if (origensPermitidas.includes(origin)) return callback(null, true);
    callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  credentials: true,
}));

app.get('/health', (req, res) => res.json({ status: 'ok', versao: '1.0.2', build: 'relatorio-stats-fix' }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/landing-pages', landingPagesRoutes);

// Migração automática — adiciona colunas novas sem quebrar instâncias existentes
async function runMigrations() {
  try {
    await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT`);
    // Permite leads sem unidade (ex: LP Pre College antes de campus definido)
    await db.query(`ALTER TABLE leads ALTER COLUMN unidade_id DROP NOT NULL`);
    // Campos do estudante para LP Pre College
    await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_aluno VARCHAR(20)`);
    await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_aluno VARCHAR(255)`);
    // Tabela para tokens de recuperação de senha (substitui armazenamento em memória)
    await db.query(`
      CREATE TABLE IF NOT EXISTS tokens_recuperacao (
        token      VARCHAR(64) PRIMARY KEY,
        usuario_id UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        expira_em  TIMESTAMPTZ NOT NULL,
        usado      BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Tabela de configurações das Landing Pages
    await db.query(`
      CREATE TABLE IF NOT EXISTS configuracoes_lp (
        id           VARCHAR(50)  PRIMARY KEY,
        nome         VARCHAR(100) NOT NULL,
        url          TEXT,
        webhook_path VARCHAR(100),
        ativa        BOOLEAN      NOT NULL DEFAULT TRUE,
        campanha     VARCHAR(100),
        origem_lead  VARCHAR(100),
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_by   UUID REFERENCES usuarios(id)
      )
    `);
    await db.query(`
      INSERT INTO configuracoes_lp (id, nome, url, webhook_path, ativa, campanha, origem_lead) VALUES
        ('lp_matriculas_2027', 'LP Matrículas 2027', 'https://www.matriculas.colegiomadrededeus.com.br/', 'lp-madre-matriculas',  TRUE, 'matriculas-2027',  'lp_matriculas_2027'),
        ('lp_pre_college',     'LP Pre College',     'https://precollege.colegiomadrededeus.com.br/',     'lp-madre-pre-college', TRUE, 'pre-college-2027', 'lp_pre_college')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('Migrações aplicadas com sucesso.');
  } catch (err) {
    console.error('Erro nas migrações:', err.message);
  }
}
runMigrations();

// Página standalone de redefinição de senha — CSP inline liberado para esta rota
app.get('/redefinir-senha', (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' https:;");
  const token = req.query.token || '';
  const apiUrl = (process.env.APP_URL || '') + '/api/auth/redefinir-senha';
  const frontendUrl = process.env.FRONTEND_URL || '';

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
'input{width:100%;padding:.625rem 2.5rem .625rem .75rem;border:1.5px solid #d1d5db;border-radius:.5rem;font-size:.875rem;outline:none}' +
'input:focus{border-color:#1e3a5f}' +
'.eye{position:absolute;right:.75rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;padding:0;line-height:0}' +
'.eye:hover{color:#6b7280}' +
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
    '<input type="password" id="nova" placeholder="Minimo 6 caracteres" autocomplete="new-password"/>' +
    '<button class="eye" type="button" onclick="verSenha(\'nova\',this)" aria-label="Mostrar senha"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
    '<div class="field"><label>Confirmar nova senha</label>' +
    '<input type="password" id="conf" placeholder="Repita a nova senha" autocomplete="new-password"/>' +
    '<button class="eye" type="button" onclick="verSenha(\'conf\',this)" aria-label="Mostrar senha"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
    '<button class="btn" id="btn" onclick="enviar()">Definir nova senha</button>'
  : '<p class="erro">Link invalido ou expirado. Solicite um novo link de recuperacao.</p>' +
    '<a href="/login" style="color:#1e3a5f;font-size:.875rem">Voltar ao login</a>'
) +
'<p class="footer">CRM Madre de Deus - Gestao de Matriculas</p>' +
'</div>' +
'<script>' +
'var TOKEN = "' + token + '";' +
'var API_URL = "' + apiUrl + '";' +
'var SVG_EYE = \'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>\';' +
'var SVG_EYEOFF = \'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>\';' +
'function verSenha(id, btn) {' +
'  var el = document.getElementById(id);' +
'  el.type = el.type === "password" ? "text" : "password";' +
'  btn.innerHTML = el.type === "password" ? SVG_EYE : SVG_EYEOFF;' +
'}' +
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
'      var loginUrl = "' + frontendUrl + '/login";' +
'      var botaoLogin = loginUrl.length > 7 ? "<a href=\\"" + loginUrl + "\\" style=\\"display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#e8882a;color:#fff;border-radius:.625rem;text-decoration:none;font-weight:600\\">Ir para o login</a>" : "<p style=\\"margin-top:1rem;font-size:.875rem;color:#6b7280\\">Feche esta aba e acesse o sistema normalmente.</p>";' +
'      document.querySelector(".card").innerHTML = "<div class=\\"ok\\" style=\\"font-size:1rem;padding:1.25rem;text-align:center\\"><strong>Senha redefinida com sucesso!</strong><br><br>Sua nova senha ja esta ativa.</div>" + botaoLogin;' +
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

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRM Madre API rodando na porta ${PORT}`);
});
