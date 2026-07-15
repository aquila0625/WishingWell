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
