const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile(filePath, baseEnv = process.env) {
  if (!fs.existsSync(filePath)) return { ...baseEnv };
  const nextEnv = { ...baseEnv };
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    if (Object.prototype.hasOwnProperty.call(nextEnv, key) && String(nextEnv[key] || '') !== '') continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1);
    }
    nextEnv[key] = value;
  }
  return nextEnv;
}

function parseOptionalString(value) {
  const text = String(value || '').trim();
  return text || null;
}

function resolveConfig(env = process.env) {
  const projectRoot = path.join(__dirname, '..');
  const dbDir = env.CHURCHOS_DB_DIR ? path.resolve(env.CHURCHOS_DB_DIR) : path.join(projectRoot, 'db');
  const uploadDir = env.CHURCHOS_UPLOAD_DIR
    ? path.resolve(env.CHURCHOS_UPLOAD_DIR)
    : path.join(projectRoot, 'public', 'uploads');

  const config = {
    port: Number(env.PORT || 3000),
    projectRoot,
    dbDir,
    dbFilePath: env.CHURCHOS_DB_FILE ? path.resolve(env.CHURCHOS_DB_FILE) : path.join(dbDir, 'churchos.sqlite'),
    uploadDir,
    databaseProvider: String(env.CHURCHOS_DB_PROVIDER || 'sqlite').toLowerCase(),
    tablePrefix: String(env.CHURCHOS_TABLE_PREFIX || '').trim(),
    supabaseUrl: parseOptionalString(env.SUPABASE_URL),
    supabaseServiceRoleKey: parseOptionalString(env.SUPABASE_SERVICE_ROLE_KEY),
    openaiApiKey: parseOptionalString(env.OPENAI_API_KEY),
    openaiTranscriptionModel: parseOptionalString(env.OPENAI_TRANSCRIPTION_MODEL) || 'gpt-4o-mini-transcribe',
    sessionSecret: parseOptionalString(env.CHURCHOS_SESSION_SECRET) || 'churchos-local-session-secret',
    adminAccount: null
  };

  const adminEmail = parseOptionalString(env.CHURCHOS_ADMIN_EMAIL);
  const adminPassword = parseOptionalString(env.CHURCHOS_ADMIN_PASSWORD);
  const adminName = parseOptionalString(env.CHURCHOS_ADMIN_NAME);
  if (adminEmail && adminPassword && adminName) {
    config.adminAccount = {
      email: adminEmail,
      password: adminPassword,
      nickname: adminName
    };
  }

  return config;
}

module.exports = { loadEnvFile, resolveConfig };
