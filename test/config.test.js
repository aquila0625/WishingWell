const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnvFile, resolveConfig } = require('../lib/config');

test('resolveConfig maps production environment variables', () => {
  const config = resolveConfig({
    PORT: '8080',
    CHURCHOS_DB_DIR: '/srv/churchos/data',
    CHURCHOS_DB_FILE: '/srv/churchos/data/prod.sqlite',
    CHURCHOS_UPLOAD_DIR: '/srv/churchos/uploads',
    CHURCHOS_DB_PROVIDER: 'supabase',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    CHURCHOS_SESSION_SECRET: 'deployment-session-secret',
    CHURCHOS_ADMIN_EMAIL: 'owner@example.org',
    CHURCHOS_ADMIN_PASSWORD: 'secret123',
    CHURCHOS_ADMIN_NAME: 'Owner'
  });

  assert.equal(config.port, 8080);
  assert.equal(config.dbDir, '/srv/churchos/data');
  assert.equal(config.dbFilePath, '/srv/churchos/data/prod.sqlite');
  assert.equal(config.uploadDir, '/srv/churchos/uploads');
  assert.equal(config.databaseProvider, 'supabase');
  assert.equal(config.supabaseUrl, 'https://example.supabase.co');
  assert.equal(config.supabaseServiceRoleKey, 'service-role-key');
  assert.equal(config.sessionSecret, 'deployment-session-secret');
  assert.deepEqual(config.adminAccount, {
    email: 'owner@example.org',
    password: 'secret123',
    nickname: 'Owner'
  });
});

test('resolveConfig provides deployable defaults', () => {
  const config = resolveConfig({});

  assert.equal(config.port, 3000);
  assert.equal(config.dbFilePath, path.join(config.dbDir, 'churchos.sqlite'));
  assert.equal(config.sessionSecret, 'churchos-local-session-secret');
  assert.equal(config.adminAccount, null);
});

test('loadEnvFile reads local .env values without overriding existing env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'churchos-env-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, [
    '# ChurchOS deployment config',
    'PORT=7000',
    'CHURCHOS_ADMIN_NAME="Env Admin"',
    'CHURCHOS_ADMIN_EMAIL=env@example.org'
  ].join('\n'));

  const loaded = loadEnvFile(file, { PORT: '9000' });

  assert.equal(loaded.PORT, '9000');
  assert.equal(loaded.CHURCHOS_ADMIN_NAME, 'Env Admin');
  assert.equal(loaded.CHURCHOS_ADMIN_EMAIL, 'env@example.org');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Render blueprint documents deployment commands without embedding secrets', () => {
  const blueprint = fs.readFileSync(path.join(__dirname, '..', 'render.yaml'), 'utf8');

  assert.match(blueprint, /type:\s*web/);
  assert.match(blueprint, /buildCommand:\s*npm install/);
  assert.match(blueprint, /startCommand:\s*npm start/);
  assert.match(blueprint, /CHURCHOS_DB_PROVIDER/);
  assert.match(blueprint, /SUPABASE_URL/);
  assert.match(blueprint, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(blueprint, /service-role-key|wang1234|254351776/);
});
