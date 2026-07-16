const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { authHeader, createApiContext } = require('./helpers/api-context');

test('authenticated users can create, vote, comment, and translate a wish', async (t) => {
  const context = createApiContext(t);
  const created = await request(context.app)
    .post('/api/wishes')
    .set('Authorization', authHeader(2))
    .send({
      category: '排班事工',
      title: '主日接送排班冲突提醒',
      content: '希望系统自动发现司机和车辆的时间冲突。'
    })
    .expect(201);

  const wishId = created.body.wish.id;
  const vote = await request(context.app)
    .post(`/api/wishes/${wishId}/vote`)
    .set('Authorization', authHeader(3))
    .expect(200);
  assert.equal(vote.body.wish.votes, 2);

  await request(context.app)
    .post(`/api/wishes/${wishId}/comment`)
    .set('Authorization', authHeader(3))
    .send({ content: '我们也遇到了相同问题。' })
    .expect(201);

  const comments = await request(context.app)
    .get(`/api/wishes/${wishId}/comments`)
    .expect(200);
  assert.equal(comments.body.length, 1);

  const translation = await request(context.app)
    .post(`/api/wishes/${wishId}/translate`)
    .send({ text: created.body.wish.content, locale: 'en' })
    .expect(200);
  assert.equal(typeof translation.body.translation, 'string');
});

test('wish listing includes public author data and comment counts', async (t) => {
  const context = createApiContext(t);
  const response = await request(context.app).get('/api/wishes').expect(200);

  assert.ok(response.body.length >= 3);
  assert.equal(response.body[0].author.password, undefined);
  assert.equal(typeof response.body[0].comment_count, 'number');
});
