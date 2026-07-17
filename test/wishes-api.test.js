const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { authHeader, createApiContext } = require('./helpers/api-context');
const { createTestDb } = require('./helpers/test-db');

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

test('my wishes include hidden posts with administrator contact details', async (t) => {
  const context = createApiContext(t);

  await request(context.app)
    .patch('/api/admin/wishes/4')
    .set('Authorization', authHeader(1))
    .send({ status: 'hidden' })
    .expect(200);

  const publicList = await request(context.app).get('/api/wishes').expect(200);
  assert.equal(publicList.body.some((wish) => wish.id === 4), false);

  const myWishes = await request(context.app)
    .get('/api/wishes/mine')
    .set('Authorization', authHeader(4))
    .expect(200);

  assert.equal(myWishes.body.items.some((wish) => wish.id === 4 && wish.status === 'hidden'), true);
  assert.deepEqual(myWishes.body.admin_contact, {
    whatsapp: 'https://wa.me/qr/KOJJUK7PYZ6LG1',
    wechat: 'aquila_wang',
    email: 'aquilawang0625@gmail.com'
  });

  await request(context.app)
    .post('/api/wishes/4/vote')
    .set('Authorization', authHeader(2))
    .expect(409);

  await request(context.app)
    .post('/api/wishes/4/comment')
    .set('Authorization', authHeader(2))
    .send({ content: '隐藏后不应继续评论。' })
    .expect(409);
});

test('expired campaign makes public participation read-only until reopened', async (t) => {
  const context = createApiContext(t);
  await request(context.app)
    .patch('/api/admin/campaign')
    .set('Authorization', authHeader(1))
    .send({ enabled: true, deadline: '2020-01-01T00:00:00.000Z' })
    .expect(200);

  await request(context.app)
    .post('/api/wishes')
    .set('Authorization', authHeader(2))
    .send({
      category: '排班事工',
      title: '截止后不能提交需求',
      content: '截止后普通用户不能继续提交新的需求内容。'
    })
    .expect(423);

  await request(context.app)
    .post('/api/wishes/1/vote')
    .set('Authorization', authHeader(2))
    .expect(423);

  await request(context.app)
    .post('/api/wishes/1/comment')
    .set('Authorization', authHeader(2))
    .send({ content: '截止后不能评论。' })
    .expect(423);

  const future = new Date(Date.now() + 86400000).toISOString();
  await request(context.app)
    .patch('/api/admin/campaign')
    .set('Authorization', authHeader(1))
    .send({ enabled: true, deadline: future })
    .expect(200);

  await request(context.app)
    .post('/api/wishes/1/comment')
    .set('Authorization', authHeader(2))
    .send({ content: '重新开放后可以评论。' })
    .expect(201);
});

test('audio transcription uses OpenAI when configured', async (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const { createApp } = require('../app');
  const calls = [];
  const app = createApp({
    dbDir: temp.dir,
    openaiApiKey: 'test-openai-key',
    openaiTranscriptionModel: 'gpt-4o-mini-transcribe',
    openaiFetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        ok: true,
        async json() {
          return { text: 'Transcribed real church need from audio.' };
        },
        async text() {
          return JSON.stringify({ text: 'Transcribed real church need from audio.' });
        }
      };
    }
  });

  const response = await request(app)
    .post('/api/wishes/audio-transcribe')
    .set('Authorization', authHeader(2))
    .attach('audio', Buffer.from('fake-webm-audio'), {
      filename: 'need.webm',
      contentType: 'audio/webm'
    })
    .expect(200);

  assert.equal(response.body.text, 'Transcribed real church need from audio.');
  assert.equal(response.body.confidence, 100);
  assert.match(response.body.audioUrl, /^\/uploads\//);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-openai-key');
});

test('audio transcription reports missing OpenAI configuration', async (t) => {
  const context = createApiContext(t);

  const response = await request(context.app)
    .post('/api/wishes/audio-transcribe')
    .set('Authorization', authHeader(2))
    .attach('audio', Buffer.from('fake-webm-audio'), {
      filename: 'need.webm',
      contentType: 'audio/webm'
    })
    .expect(503);

  assert.match(response.body.error, /OpenAI/);
});
