const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApiContext } = require('./helpers/api-context');

test('admin can update campaign settings and public users can read them', async (t) => {
  const context = createApiContext(t);
  await request(context.app)
    .patch('/api/admin/campaign')
    .set('Authorization', 'Bearer 1')
    .send({ enabled: true, deadline: '2026-12-31T23:59:59.000Z' })
    .expect(200);

  const response = await request(context.app).get('/api/campaign').expect(200);
  assert.equal(response.body.enabled, true);
  assert.equal(response.body.closed, false);
});

test('non-admin users cannot access analysis', async (t) => {
  const context = createApiContext(t);
  await request(context.app)
    .get('/api/admin/projects/ai-pre-export')
    .set('Authorization', 'Bearer 2')
    .expect(403);
});

test('share QR endpoint returns a PNG data URL', async (t) => {
  const context = createApiContext(t);
  const response = await request(context.app)
    .get('/api/share/qr')
    .query({ url: 'https://example.test/wishing-well' })
    .expect(200);

  assert.match(response.body.dataUrl, /^data:image\/png;base64,/);
});
