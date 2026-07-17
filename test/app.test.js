const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createTestDb } = require('./helpers/test-db');

test('GET /api/health returns an operational response', async (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const { createApp } = require('../app');

  const response = await request(createApp({ dbDir: temp.dir }))
    .get('/api/health')
    .expect(200);

  assert.deepEqual(response.body, { status: 'ok' });
});

test('unknown API paths return structured JSON errors', async (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const { createApp } = require('../app');

  const response = await request(createApp({ dbDir: temp.dir }))
    .get('/api/missing')
    .expect(404);

  assert.equal(response.body.error, '接口不存在');
});

test('GET /api/environment identifies staging without exposing secrets', async (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const { createApp } = require('../app');

  const response = await request(createApp({ dbDir: temp.dir, tablePrefix: 'staging_' }))
    .get('/api/environment')
    .expect(200);

  assert.deepEqual(response.body, {
    environment: 'staging',
    label: '测试环境',
    badge: 'STAGING',
    staging: true
  });
  assert.doesNotMatch(JSON.stringify(response.body), /secret|service|key/i);
});

test('GET /api/public-stats returns homepage counters from real data', async (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const { createApp } = require('../app');

  const response = await request(createApp({ dbDir: temp.dir }))
    .get('/api/public-stats')
    .expect(200);

  assert.deepEqual(response.body, {
    participants: 3,
    requirements: 4,
    planned: 2,
    comments: 2
  });
});

test('createApp can initialize with the Supabase database provider', async () => {
  const { createApp } = require('../app');
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      async json() {
        return [];
      },
      async text() {
        return '[]';
      }
    };
  };

  const response = await request(createApp({
    databaseProvider: 'supabase',
    supabaseUrl: 'https://churchos.supabase.co',
    supabaseServiceRoleKey: 'service-key',
    tablePrefix: 'staging_',
    fetchImpl
  }))
    .get('/api/health')
    .expect(200);

  assert.deepEqual(response.body, { status: 'ok' });
  assert.ok(calls.some((url) => url.includes('/rest/v1/staging_churches?')));
});
