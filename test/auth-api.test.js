const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { createApiContext } = require('./helpers/api-context');

test('registration returns a public user and login returns the same identity', async (t) => {
  const context = createApiContext(t);
  const registration = await request(context.app)
    .post('/api/auth/register')
    .send({
      email: 'new@church.org',
      password: 'secret12',
      nickname: 'New Worker',
      church_name: 'Grace Church',
      country: 'Canada',
      state: 'Ontario',
      city: 'Toronto',
      role_category: '同工',
      consent: 'on'
    })
    .expect(201);

  assert.equal(registration.body.user.password, undefined);

  const login = await request(context.app)
    .post('/api/auth/login')
    .send({ email: 'new@church.org', password: 'secret12' })
    .expect(200);

  assert.equal(login.body.user.id, registration.body.user.id);
  assert.equal(login.body.user.password, undefined);
  assert.match(login.body.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.notEqual(login.body.token, String(registration.body.user.id));

  const me = await request(context.app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(200);

  assert.equal(me.body.id, registration.body.user.id);

  const stored = await context.app.locals.db.findById('users', registration.body.user.id);
  assert.match(stored.password, /^pbkdf2\$/);
});

test('numeric bearer tokens are rejected', async (t) => {
  const context = createApiContext(t);

  await request(context.app)
    .get('/api/auth/me')
    .set('Authorization', 'Bearer 4')
    .expect(401);
});

test('legacy seeded passwords still log in and upgrade to a hash', async (t) => {
  const context = createApiContext(t);

  assert.equal((await context.app.locals.db.findById('users', 1)).password, 'adminpassword');

  await request(context.app)
    .post('/api/auth/login')
    .send({ email: 'admin@churchos.net', password: 'adminpassword' })
    .expect(200);

  assert.match((await context.app.locals.db.findById('users', 1)).password, /^pbkdf2\$/);
});

test('custom admin account from deployment config is provisioned on startup', async (t) => {
  const context = createApiContext(t);
  const app = createApp({
    dbDir: context.dir,
    adminAccount: {
      email: 'owner@example.org',
      password: 'secret123',
      nickname: 'Owner'
    }
  });
  await app.locals.ready;
  await request(app).get('/api/health').expect(200);
  const admin = (await app.locals.db.read('users')).find((user) => user.email === 'owner@example.org');
  assert.equal(admin.is_admin, true);
});

test('church autocomplete prioritizes matching location', async (t) => {
  const context = createApiContext(t);
  const response = await request(context.app)
    .get('/api/churches/autocomplete')
    .query({ query: '华人', city: '温哥华', state: 'British Columbia' })
    .expect(200);

  assert.ok(response.body.length > 0);
  assert.match(response.body[0].city, /温哥华/);
});
