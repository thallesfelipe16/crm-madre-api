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
    console.log('Migrações aplicadas com sucesso.');
  } catch (err) {
    console.error('Erro nas migrações:', err.message);
  }
}
runMigrations();

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRM Madre API rodando na porta ${PORT}`);
});
