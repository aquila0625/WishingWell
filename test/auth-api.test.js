const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
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
      role_category: '同工'
    })
    .expect(201);

  assert.equal(registration.body.user.password, undefined);

  const login = await request(context.app)
    .post('/api/auth/login')
    .send({ email: 'new@church.org', password: 'secret12' })
    .expect(200);

  assert.equal(login.body.user.id, registration.body.user.id);
  assert.equal(login.body.user.password, undefined);
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
