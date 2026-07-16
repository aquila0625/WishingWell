const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { authHeader, createApiContext } = require('./helpers/api-context');

test('admin can update campaign settings and public users can read them', async (t) => {
  const context = createApiContext(t);
  await request(context.app)
    .patch('/api/admin/campaign')
    .set('Authorization', authHeader(1))
    .send({ enabled: true, deadline: '2026-12-31T23:59:59.000Z' })
    .expect(200);

  const response = await request(context.app).get('/api/campaign').expect(200);
  assert.equal(response.body.enabled, true);
  assert.equal(response.body.closed, false);
  assert.equal(response.body.homepage_draft, undefined);
  assert.equal(response.body.initial_cleanup_done, undefined);
});

test('non-admin users cannot access analysis', async (t) => {
  const context = createApiContext(t);
  await request(context.app)
    .get('/api/admin/projects/ai-pre-export')
    .set('Authorization', authHeader(2))
    .expect(403);
});

test('admin can manage requirement status, replies, visibility, and export', async (t) => {
  const context = createApiContext(t);

  const list = await request(context.app)
    .get('/api/admin/wishes')
    .set('Authorization', authHeader(1))
    .query({ status: 'accepted', category: '排班事工', search: '排班' })
    .expect(200);

  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].author.email, 'pastor.tim@grace.org');

  const updated = await request(context.app)
    .patch('/api/admin/wishes/4')
    .set('Authorization', authHeader(1))
    .send({ status: 'planned', admin_reply: '已进入第一版路线图。' })
    .expect(200);

  assert.equal(updated.body.wish.status, 'planned');
  assert.equal(updated.body.wish.admin_reply, '已进入第一版路线图。');

  const notifications = await request(context.app)
    .get('/api/notifications')
    .set('Authorization', authHeader(4))
    .expect(200);
  assert.equal(notifications.body.at(-1).type, 'admin_update');

  const hidden = await request(context.app)
    .patch('/api/admin/wishes/4')
    .set('Authorization', authHeader(1))
    .send({ status: 'hidden' })
    .expect(200);
  assert.equal(hidden.body.wish.status, 'hidden');

  const restored = await request(context.app)
    .patch('/api/admin/wishes/4')
    .set('Authorization', authHeader(1))
    .send({ status: 'voting' })
    .expect(200);
  assert.equal(restored.body.wish.status, 'voting');

  const exported = await request(context.app)
    .post('/api/admin/wishes/export')
    .set('Authorization', authHeader(1))
    .send({ scope: 'selected', ids: [4] })
    .expect(200);

  assert.equal(exported.body.export.requirements.length, 1);
  assert.equal(exported.body.export.requirements[0].author.email, '254351776@qq.com');
  assert.match(exported.body.text, /254351776@qq\.com/);
});

test('admin can merge requirements and lock author editing', async (t) => {
  const context = createApiContext(t);

  await request(context.app)
    .post('/api/admin/wishes/merge')
    .set('Authorization', authHeader(1))
    .send({ source_wish_id: 4, target_wish_id: 1, reason: '与主日流程管理需求合并处理。' })
    .expect(200);

  const editAttempt = await request(context.app)
    .patch('/api/wishes/4')
    .set('Authorization', authHeader(4))
    .send({ category: '更多事工', title: '关于主日程序单更新', content: '希望继续修改这个已经合并的需求内容。' })
    .expect(409);

  assert.equal(editAttempt.body.error, '该需求已被官方锁定，不能继续修改');
});

test('admin can list and disable users', async (t) => {
  const context = createApiContext(t);

  const users = await request(context.app)
    .get('/api/admin/users')
    .set('Authorization', authHeader(1))
    .expect(200);

  const aquila = users.body.items.find((user) => user.email === '254351776@qq.com');
  assert.equal(aquila.requirement_count, 1);
  assert.equal(aquila.vote_count, 1);

  const disabled = await request(context.app)
    .patch('/api/admin/users/4')
    .set('Authorization', authHeader(1))
    .send({ disabled: true })
    .expect(200);

  assert.equal(disabled.body.user.disabled, true);

  await request(context.app)
    .post('/api/auth/login')
    .send({ email: '254351776@qq.com', password: 'wang1234' })
    .expect(403);
});

test('admin can draft and publish homepage content settings', async (t) => {
  const context = createApiContext(t);

  const payload = {
    hero_title: 'ChurchOS 教会通 APP',
    hero_tagline: '共同定义第一版',
    final_cta_title: '提交真实需求',
    show_share_button: false
  };

  const saved = await request(context.app)
    .patch('/api/admin/homepage')
    .set('Authorization', authHeader(1))
    .send(payload)
    .expect(200);

  assert.deepEqual(saved.body.draft, payload);
  assert.equal(saved.body.has_unpublished_changes, true);

  const publicBeforePublish = await request(context.app)
    .get('/api/campaign')
    .expect(200);
  assert.notEqual(publicBeforePublish.body.homepage?.hero_tagline, '共同定义第一版');
  assert.equal(publicBeforePublish.body.homepage_draft, undefined);

  const read = await request(context.app)
    .get('/api/admin/homepage')
    .set('Authorization', authHeader(1))
    .expect(200);
  assert.equal(read.body.draft.hero_tagline, '共同定义第一版');
  assert.notEqual(read.body.published.hero_tagline, '共同定义第一版');

  const published = await request(context.app)
    .post('/api/admin/homepage/publish')
    .set('Authorization', authHeader(1))
    .expect(200);

  assert.deepEqual(published.body.published, payload);
  assert.equal(published.body.has_unpublished_changes, false);

  const publicAfterPublish = await request(context.app)
    .get('/api/campaign')
    .expect(200);
  assert.equal(publicAfterPublish.body.homepage.hero_tagline, '共同定义第一版');
  assert.equal(publicAfterPublish.body.homepage.show_share_button, false);
});

test('admin can run initial launch cleanup only once', async (t) => {
  const context = createApiContext(t);

  const before = await request(context.app)
    .get('/api/admin/launch-cleanup')
    .set('Authorization', authHeader(1))
    .expect(200);

  assert.equal(before.body.initial_cleanup_done, false);
  assert.ok(before.body.counts.users > 0);
  assert.ok(before.body.counts.wishes > 0);
  assert.ok(before.body.counts.comments > 0);

  await request(context.app)
    .post('/api/admin/launch-cleanup')
    .set('Authorization', authHeader(1))
    .send({ confirm: '清空' })
    .expect(400);

  const cleaned = await request(context.app)
    .post('/api/admin/launch-cleanup')
    .set('Authorization', authHeader(1))
    .send({ confirm: '确认首次上线清空' })
    .expect(200);

  assert.equal(cleaned.body.initial_cleanup_done, true);
  assert.equal(cleaned.body.counts.users, 0);
  assert.equal(cleaned.body.counts.wishes, 0);
  assert.equal(cleaned.body.counts.comments, 0);
  assert.equal(cleaned.body.counts.notifications, 0);
  assert.equal(cleaned.body.counts.email_logs, 0);

  const users = await request(context.app)
    .get('/api/admin/users')
    .set('Authorization', authHeader(1))
    .expect(200);
  assert.equal(users.body.items.length, 0);

  const publicWishes = await request(context.app)
    .get('/api/wishes')
    .expect(200);
  assert.equal(publicWishes.body.length, 0);

  const campaign = await request(context.app)
    .get('/api/campaign')
    .expect(200);
  assert.ok(Object.prototype.hasOwnProperty.call(campaign.body, 'enabled'));

  await request(context.app)
    .post('/api/admin/launch-cleanup')
    .set('Authorization', authHeader(1))
    .send({ confirm: '确认首次上线清空' })
    .expect(409);
});

test('admin can simulate progress email and read send history', async (t) => {
  const context = createApiContext(t);

  const sent = await request(context.app)
    .post('/api/admin/progress-emails/send')
    .set('Authorization', authHeader(1))
    .send({ subject: 'ChurchOS 开发进度', body: '第一版后台已经开始整理需求。' })
    .expect(200);

  assert.equal(sent.body.log.status, 'simulated');
  assert.equal(sent.body.log.recipient_count, 3);
  assert.deepEqual(sent.body.log.failures, []);

  const logs = await request(context.app)
    .get('/api/admin/progress-emails/logs')
    .set('Authorization', authHeader(1))
    .expect(200);

  assert.equal(logs.body.items.length, 1);
  assert.equal(logs.body.items[0].subject, 'ChurchOS 开发进度');
});

test('share QR endpoint returns a PNG data URL', async (t) => {
  const context = createApiContext(t);
  const response = await request(context.app)
    .get('/api/share/qr')
    .query({ url: 'https://example.test/wishing-well' })
    .expect(200);

  assert.match(response.body.dataUrl, /^data:image\/png;base64,/);
});
