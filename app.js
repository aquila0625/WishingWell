const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./db');
const { hashPassword } = require('./lib/passwords');
const { createAuthRouter } = require('./routes/auth');
const { createWishesRouter } = require('./routes/wishes');
const { createAdminRouter } = require('./routes/admin');
const { createShareRouter } = require('./routes/share');

function createUpload(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: uploadDir,
    filename(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`);
    }
  });

  return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
}

function createApp({
  dbDir,
  dbFilePath,
  databaseProvider,
  supabaseUrl,
  supabaseServiceRoleKey,
  tablePrefix,
  fetchImpl,
  adminAccount,
  sessionSecret,
  uploadDir = path.join(__dirname, 'public', 'uploads')
} = {}) {
  const app = express();
  const database = createDatabase({
    provider: databaseProvider,
    dir: dbDir,
    filePath: dbFilePath,
    supabaseUrl,
    supabaseServiceRoleKey,
    tablePrefix,
    fetchImpl
  });
  const upload = createUpload(uploadDir);

  const ready = (async () => {
    await database.seed();
    if (!adminAccount?.email || !adminAccount?.password || !adminAccount?.nickname) return;
    const email = String(adminAccount.email).trim().toLowerCase();
    const existing = (await database.read('users')).find((user) => user.email.toLowerCase() === email);
    const payload = {
      email,
      password: hashPassword(String(adminAccount.password)),
      nickname: String(adminAccount.nickname).trim(),
      church_name: '系统初始化',
      country: '系统初始化',
      state: '系统初始化',
      city: '系统初始化',
      role_category: '系统管理员',
      avatar_color: 'linear-gradient(135deg, #a200ff, #00f0ff)',
      is_admin: true
    };
    if (existing) {
      await database.update('users', existing.id, payload);
    } else {
      await database.insert('users', payload);
    }
  })();
  app.locals.db = database;
  app.locals.ready = ready;
  app.locals.upload = upload;
  app.locals.uploadDir = uploadDir;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(async (req, res, next) => {
    try {
      await ready;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/environment', (req, res) => {
    const staging = String(tablePrefix || '').trim() === 'staging_';
    res.json({
      environment: staging ? 'staging' : 'production',
      label: staging ? '测试环境' : '正式环境',
      badge: staging ? 'STAGING' : 'PRODUCTION',
      staging
    });
  });
  app.use('/api', createShareRouter({ database }));
  app.use('/api', createAuthRouter({ database, upload, sessionSecret }));
  app.use('/api', createWishesRouter({ database, upload, sessionSecret }));
  app.use('/api/admin', createAdminRouter({ database, sessionSecret }));
  app.use('/vendor/lucide', express.static(path.join(__dirname, 'node_modules', 'lucide', 'dist', 'umd')));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.publicMessage || '服务暂时不可用，请稍后重试'
    });
  });

  return app;
}

module.exports = { createApp };
