const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./db');
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
  uploadDir = path.join(__dirname, 'public', 'uploads')
} = {}) {
  const app = express();
  const database = createDatabase({ dir: dbDir });
  const upload = createUpload(uploadDir);

  database.seed();
  app.locals.db = database;
  app.locals.upload = upload;
  app.locals.uploadDir = uploadDir;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', createShareRouter({ database }));
  app.use('/api', createAuthRouter({ database, upload }));
  app.use('/api', createWishesRouter({ database, upload }));
  app.use('/api/admin', createAdminRouter({ database }));
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
