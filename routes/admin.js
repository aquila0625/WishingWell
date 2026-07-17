const express = require('express');
const { adminAuthenticate } = require('../lib/http');
const { normalizeHomepage } = require('../lib/homepage');

const WISH_STATUSES = new Set([
  'voting', 'accepted', 'planned', 'developing', 'testing', 'completed', 'rejected', 'merged', 'hidden'
]);

const INITIAL_CLEANUP_CONFIRMATION = '确认首次上线清空';

function createAdminRouter({ database, sessionSecret }) {
  const router = express.Router();
  const requireAdmin = adminAuthenticate(database, { sessionSecret });
  router.use(requireAdmin);

  async function readSettings() {
    const settings = (await database.read('settings'))[0] || {};
    return { id: 1, enabled: false, deadline: null, ...settings };
  }

  async function writeSettings(updates) {
    const settings = await readSettings();
    const nextSettings = { ...settings, ...updates, id: Number(settings.id || 1) };
    await database.write('settings', [nextSettings]);
    return nextSettings;
  }

  function homepageState(settings) {
    const draft = normalizeHomepage(settings.homepage_draft || settings.homepage || settings.homepage_published);
    const published = normalizeHomepage(settings.homepage_published || settings.homepage);
    const hasUnpublishedChanges = JSON.stringify(draft) !== JSON.stringify(published);
    return {
      homepage: draft,
      draft,
      published,
      has_unpublished_changes: hasUnpublishedChanges,
      published_at: settings.homepage_published_at || null
    };
  }

  async function notify(userId, type, message) {
    await database.insert('notifications', { user_id: Number(userId), type, message, read: false });
  }

  async function authorFor(wish) {
    const user = await database.findById('users', wish.user_id) || {};
    return {
      id: user.id,
      email: user.email || '',
      nickname: user.nickname || '未知同工',
      church_name: user.church_name || '',
      country: user.country || '',
      state: user.state || '',
      city: user.city || '',
      role_category: user.role_category || ''
    };
  }

  async function serializeAdminWish(wish) {
    const comments = (await database.read('comments')).filter((comment) => comment.wish_id === wish.id);
    return { ...wish, author: await authorFor(wish), comment_count: comments.length };
  }

  async function filterWishes(rows, query) {
    const status = String(query.status || '').trim();
    const category = String(query.category || '').trim();
    const search = String(query.search || '').trim().toLowerCase();
    const results = [];
    for (const wish of rows) {
      if (status && status !== 'all' && wish.status !== status) continue;
      if (category && category !== 'all' && wish.category !== category) continue;
      if (!search) {
        results.push(wish);
        continue;
      }
      const author = await authorFor(wish);
      if ([wish.title, wish.content, wish.category, wish.status, author.email, author.nickname, author.church_name]
        .some((value) => String(value || '').toLowerCase().includes(search))) {
        results.push(wish);
      }
    }
    return results;
  }

  router.get('/wishes', async (req, res) => {
    const filtered = await filterWishes(await database.read('wishes'), req.query);
    const sorted = filtered.sort((left, right) => Number(right.created_at || 0) - Number(left.created_at || 0));
    const items = await Promise.all(sorted.map(serializeAdminWish));
    res.json({ items, total: items.length });
  });

  router.patch('/wishes/:id', async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      const status = String(req.body.status || '').trim();
      if (!WISH_STATUSES.has(status)) return res.status(400).json({ error: '请选择有效的需求状态' });
      updates.status = status;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'admin_reply')) {
      updates.admin_reply = String(req.body.admin_reply || '').trim() || null;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: '没有可保存的更改' });

    const updated = await database.update('wishes', wish.id, updates);
    await notify(wish.user_id, 'admin_update', `《${wish.title}》的官方状态或答复已更新`);
    res.json({ message: '需求已更新', wish: await serializeAdminWish(updated) });
  });

  router.post('/wishes/export', async (req, res) => {
    const scope = String(req.body.scope || 'all');
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
    const filters = req.body.filters || {};
    let wishes = await database.read('wishes');
    if (scope === 'selected') wishes = wishes.filter((wish) => ids.includes(wish.id));
    if (scope === 'filtered') wishes = await filterWishes(wishes, filters);

    const requirements = [];
    for (const wish of wishes) {
      const comments = (await database.read('comments'))
        .filter((comment) => comment.wish_id === wish.id)
        .map((comment) => ({
          id: comment.id,
          user_id: comment.user_id,
          nickname: comment.nickname,
          content: comment.content,
          created_at: comment.created_at
        }));
      requirements.push({
        id: wish.id,
        title: wish.title,
        content: wish.content,
        category: wish.category,
        status: wish.status,
        votes: wish.votes || 0,
        admin_reply: wish.admin_reply || null,
        parent_wish_id: wish.parent_wish_id || null,
        merge_reason: wish.merge_reason || null,
        created_at: wish.created_at || null,
        author: await authorFor(wish),
        comments
      });
    }

    const exportData = { generated_at: new Date().toISOString(), scope, requirement_count: requirements.length, requirements };
    res.json({ export: exportData, text: JSON.stringify(exportData, null, 2) });
  });

  router.get('/users', async (req, res) => {
    const wishes = await database.read('wishes');
    const comments = await database.read('comments');
    const items = (await database.read('users'))
      .filter((user) => !user.is_admin)
      .map((user) => ({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        church_name: user.church_name,
        country: user.country,
        state: user.state,
        city: user.city,
        role_category: user.role_category,
        disabled: Boolean(user.disabled),
        created_at: user.created_at || null,
        requirement_count: wishes.filter((wish) => wish.user_id === user.id).length,
        vote_count: wishes.filter((wish) => (wish.voted_users || []).includes(user.id)).length,
        comment_count: comments.filter((comment) => comment.user_id === user.id).length
      }));
    res.json({ items, total: items.length });
  });

  router.patch('/users/:id', async (req, res) => {
    const user = await database.findById('users', req.params.id);
    if (!user) return res.status(404).json({ error: '未找到该用户' });
    if (user.is_admin) return res.status(409).json({ error: '管理员账号不能在这里停用' });
    const updated = await database.update('users', user.id, { disabled: Boolean(req.body.disabled) });
    res.json({ message: updated.disabled ? '用户已停用' : '用户已恢复', user: updated });
  });

  router.get('/homepage', async (req, res) => {
    res.json(homepageState(await readSettings()));
  });

  router.patch('/homepage', async (req, res) => {
    const homepage = {
      hero_title: String(req.body.hero_title || '').trim(),
      hero_tagline: String(req.body.hero_tagline || '').trim(),
      final_cta_title: String(req.body.final_cta_title || '').trim(),
      show_share_button: Boolean(req.body.show_share_button)
    };
    if (!homepage.hero_title || !homepage.hero_tagline || !homepage.final_cta_title) {
      return res.status(400).json({ error: '首页主要文案不能为空' });
    }
    const settings = await writeSettings({ homepage_draft: homepage });
    res.json({ message: '首页草稿已保存', ...homepageState(settings) });
  });

  router.post('/homepage/publish', async (req, res) => {
    const settings = await readSettings();
    const draft = normalizeHomepage(settings.homepage_draft || settings.homepage || settings.homepage_published);
    const nextSettings = await writeSettings({
      homepage_draft: draft,
      homepage_published: draft,
      homepage_published_at: new Date().toISOString()
    });
    res.json({ message: '首页内容已发布到正式网站', ...homepageState(nextSettings) });
  });

  async function launchCleanupCounts() {
    const users = (await database.read('users')).filter((user) => !user.is_admin).length;
    const wishes = (await database.read('wishes')).length;
    const comments = (await database.read('comments')).length;
    const notifications = (await database.read('notifications')).length;
    const emailLogs = (await database.read('email_logs')).length;
    return { users, wishes, comments, notifications, email_logs: emailLogs };
  }

  router.get('/launch-cleanup', async (req, res) => {
    const settings = await readSettings();
    res.json({
      initial_cleanup_done: Boolean(settings.initial_cleanup_done),
      confirmation: INITIAL_CLEANUP_CONFIRMATION,
      counts: await launchCleanupCounts()
    });
  });

  router.post('/launch-cleanup', async (req, res) => {
    const settings = await readSettings();
    if (settings.initial_cleanup_done) {
      return res.status(409).json({ error: '首次上线清空已经执行过，后续不能再次清空数据' });
    }
    if (String(req.body.confirm || '').trim() !== INITIAL_CLEANUP_CONFIRMATION) {
      return res.status(400).json({ error: `请输入“${INITIAL_CLEANUP_CONFIRMATION}”确认操作` });
    }

    const adminUsers = (await database.read('users')).filter((user) => user.is_admin);
    await database.write('users', adminUsers);
    await database.write('wishes', []);
    await database.write('comments', []);
    await database.write('notifications', []);
    await database.write('email_logs', []);
    await writeSettings({
      initial_cleanup_done: true,
      initial_cleanup_done_at: new Date().toISOString(),
      initial_cleanup_done_by: req.user.id
    });

    res.json({
      message: '首次上线测试数据已清空，此操作后续不可再次执行',
      initial_cleanup_done: true,
      counts: await launchCleanupCounts()
    });
  });

  router.post('/progress-emails/send', async (req, res) => {
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.body || '').trim();
    if (!subject || !body) return res.status(400).json({ error: '请填写邮件标题和正文' });

    const submitterIds = new Set((await database.read('wishes')).map((wish) => wish.user_id));
    const recipients = (await database.read('users'))
      .filter((user) => submitterIds.has(user.id) && !user.is_admin && !user.disabled)
      .map((user) => ({ id: user.id, email: user.email, nickname: user.nickname }));

    const log = await database.insert('email_logs', {
      subject,
      body,
      status: 'simulated',
      recipient_count: recipients.length,
      recipients,
      failures: [],
      sent_by: req.user.id
    });

    res.json({ message: `已模拟发送 ${recipients.length} 封邮件`, log });
  });

  router.get('/progress-emails/logs', async (req, res) => {
    const items = (await database.read('email_logs')).slice().sort((left, right) => Number(right.created_at || 0) - Number(left.created_at || 0));
    res.json({ items, total: items.length });
  });

  router.patch('/campaign', async (req, res) => {
    const enabled = Boolean(req.body.enabled);
    const deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    if (enabled && (!deadline || Number.isNaN(deadline.getTime()))) {
      return res.status(400).json({ error: '请选择有效的截止时间' });
    }
    const settings = await writeSettings({ enabled, deadline: deadline ? deadline.toISOString() : null });
    res.json({ ...settings, closed: Boolean(enabled && deadline && deadline.getTime() <= Date.now()) });
  });

  router.post('/wishes/merge', async (req, res) => {
    const source = await database.findById('wishes', req.body.source_wish_id);
    const target = await database.findById('wishes', req.body.target_wish_id);
    const reason = String(req.body.reason || '').trim();
    if (!source || !target) return res.status(404).json({ error: '未找到合并源或目标需求' });
    if (!reason) return res.status(400).json({ error: '请填写合并原因' });
    if (source.id === target.id) return res.status(400).json({ error: '合并源和目标不能相同' });
    const voters = [...new Set([...(target.voted_users || []), ...(source.voted_users || [])])];
    await database.update('wishes', source.id, { status: 'merged', parent_wish_id: target.id, merge_reason: reason });
    await database.update('wishes', target.id, { voted_users: voters, votes: voters.length });
    await notify(source.user_id, 'merge', `《${source.title}》已合并至《${target.title}》`);
    res.json({ message: '需求合并成功' });
  });

  router.get('/disputes', async (req, res) => {
    const disputes = [];
    for (const wish of (await database.read('wishes')).filter((item) => item.dispute_status === 'pending')) {
      const author = await database.findById('users', wish.user_id);
      const parent = await database.findById('wishes', wish.parent_wish_id);
      disputes.push({ ...wish, author_nickname: author?.nickname || '未知同工', parent_title: parent?.title || '主需求' });
    }
    res.json(disputes);
  });

  router.post('/wishes/:id/resolve-dispute', async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该申诉需求' });
    const approved = req.body.action === 'approve';
    const updated = await database.update('wishes', wish.id, approved
      ? { status: 'voting', parent_wish_id: null, merge_reason: null, dispute_status: 'approved' }
      : { dispute_status: 'rejected' });
    await notify(wish.user_id, 'dispute_resolved', approved ? '您的拆分申诉已通过' : '您的拆分申诉未通过');
    res.json({ message: approved ? '已同意拆分' : '已驳回申诉', wish: updated });
  });

  router.get('/projects/ai-pre-export', async (req, res) => {
    const users = (await database.read('users')).filter((user) => !user.is_admin);
    const wishes = await database.read('wishes');
    const roleCounts = users.reduce((counts, user) => {
      counts[user.role_category] = (counts[user.role_category] || 0) + 1;
      return counts;
    }, {});
    const roleSummary = Object.entries(roleCounts).map(([role, count]) => `${role} ${count} 位`).join('、');
    res.json({
      demographics: `当前共有 ${users.length} 位同工参与，覆盖 ${new Set(users.map((user) => user.church_name)).size} 家堂会；${roleSummary}。`,
      clusters: [
        { id: 'scheduling', topic: '智能服侍排班与日历冲突检测', description: '集中解决跨事工撞期、提醒和日历同步。', total_votes: wishes.filter((wish) => /排班|日历/.test(`${wish.title}${wish.content}`)).reduce((sum, wish) => sum + wish.votes, 0) },
        { id: 'finance', topic: '奉献与合规凭证自动化', description: '降低年底税务凭证核对、生成和发送成本。', total_votes: wishes.filter((wish) => /奉献|财务|税/.test(`${wish.title}${wish.content}`)).reduce((sum, wish) => sum + wish.votes, 0) }
      ],
      recommendations: [
        { priority: 'P0', topic: '智能服侍排班', value: '高频、跨事工、直接影响主日执行。' },
        { priority: 'P0', topic: '税务凭证自动化', value: '强合规需求，可显著减少财务人工。' },
        { priority: 'P1', topic: '关怀随访', value: '提升新朋友与会友持续连接。' }
      ]
    });
  });

  router.post('/projects/export-document', async (req, res) => {
    const format = String(req.body.format || 'markdown');
    if (format === 'markdown') {
      const report = req.body.reportData || {};
      const content = [
        '# ChurchOS 需求共创分析报告',
        '',
        '## 同工画像',
        report.demographics || '暂无统计',
        '',
        '## 核心痛点',
        ...(report.clusters || []).map((cluster) => `- ${cluster.topic}：${cluster.description}（${cluster.total_votes} 票）`),
        '',
        '## 优先级建议',
        ...(report.recommendations || []).map((item) => `- ${item.priority} ${item.topic}：${item.value}`)
      ].join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="ChurchOS-CoCreation-Report.md"');
      res.type('text/markdown; charset=utf-8').send(content);
      return;
    }

    const users = await database.read('users');
    const rows = (await database.read('wishes')).map((wish) => {
      const author = users.find((user) => user.id === wish.user_id) || {};
      return [wish.id, wish.category, wish.title, wish.votes, author.nickname || '', author.church_name || '', wish.status]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',');
    });
    const content = `\ufeff"ID","分类","标题","票数","提交者","教会","状态"\n${rows.join('\n')}`;
    res.setHeader('Content-Disposition', 'attachment; filename="ChurchOS-Backlog.csv"');
    res.type('text/csv; charset=utf-8').send(content);
  });

  router.get('/projects/send-emails', async (req, res) => {
    const users = (await database.read('users')).filter((user) => !user.is_admin);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    users.forEach((user, index) => {
      res.write(`data: ${JSON.stringify({ index: index + 1, total: users.length, log: `已模拟发送至 ${user.nickname} (${user.email})` })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, log: `模拟发送完成，共 ${users.length} 封` })}\n\n`);
    res.end();
  });

  return router;
}

module.exports = { createAdminRouter };
