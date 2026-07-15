const express = require('express');
const { adminAuthenticate } = require('../lib/http');

function createAdminRouter({ database }) {
  const router = express.Router();
  const requireAdmin = adminAuthenticate(database);
  router.use(requireAdmin);

  function notify(userId, type, message) {
    database.insert('notifications', { user_id: Number(userId), type, message, read: false });
  }

  router.patch('/campaign', (req, res) => {
    const enabled = Boolean(req.body.enabled);
    const deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    if (enabled && (!deadline || Number.isNaN(deadline.getTime()))) {
      return res.status(400).json({ error: '请选择有效的截止时间' });
    }
    const settings = { enabled, deadline: deadline ? deadline.toISOString() : null };
    database.write('settings', [settings]);
    res.json({ ...settings, closed: Boolean(enabled && deadline && deadline.getTime() <= Date.now()) });
  });

  router.post('/wishes/merge', (req, res) => {
    const source = database.findById('wishes', req.body.source_wish_id);
    const target = database.findById('wishes', req.body.target_wish_id);
    const reason = String(req.body.reason || '').trim();
    if (!source || !target) return res.status(404).json({ error: '未找到合并源或目标需求' });
    if (!reason) return res.status(400).json({ error: '请填写合并原因' });
    const voters = [...new Set([...(target.voted_users || []), ...(source.voted_users || [])])];
    database.update('wishes', source.id, { status: 'merged', parent_wish_id: target.id, merge_reason: reason });
    database.update('wishes', target.id, { voted_users: voters, votes: voters.length });
    notify(source.user_id, 'merge', `《${source.title}》已合并至《${target.title}》`);
    res.json({ message: '需求合并成功' });
  });

  router.get('/disputes', (req, res) => {
    const disputes = database.read('wishes')
      .filter((wish) => wish.dispute_status === 'pending')
      .map((wish) => ({
        ...wish,
        author_nickname: database.findById('users', wish.user_id)?.nickname || '未知同工',
        parent_title: database.findById('wishes', wish.parent_wish_id)?.title || '主需求'
      }));
    res.json(disputes);
  });

  router.post('/wishes/:id/resolve-dispute', (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该申诉需求' });
    const approved = req.body.action === 'approve';
    const updated = database.update('wishes', wish.id, approved
      ? { status: 'voting', parent_wish_id: null, merge_reason: null, dispute_status: 'approved' }
      : { dispute_status: 'rejected' });
    notify(wish.user_id, 'dispute_resolved', approved ? '您的拆分申诉已通过' : '您的拆分申诉未通过');
    res.json({ message: approved ? '已同意拆分' : '已驳回申诉', wish: updated });
  });

  router.get('/projects/ai-pre-export', (req, res) => {
    const users = database.read('users').filter((user) => !user.is_admin);
    const wishes = database.read('wishes');
    const roleCounts = users.reduce((counts, user) => {
      counts[user.role_category] = (counts[user.role_category] || 0) + 1;
      return counts;
    }, {});
    const roleSummary = Object.entries(roleCounts)
      .map(([role, count]) => `${role} ${count} 位`)
      .join('、');
    res.json({
      demographics: `当前共有 ${users.length} 位同工参与，覆盖 ${new Set(users.map((user) => user.church_name)).size} 家堂会；${roleSummary}。`,
      clusters: [
        {
          id: 'scheduling',
          topic: '智能服侍排班与日历冲突检测',
          description: '集中解决跨事工撞期、提醒和日历同步。',
          total_votes: wishes.filter((wish) => /排班|日历/.test(`${wish.title}${wish.content}`)).reduce((sum, wish) => sum + wish.votes, 0)
        },
        {
          id: 'finance',
          topic: '奉献与合规凭证自动化',
          description: '降低年底税务凭证核对、生成和发送成本。',
          total_votes: wishes.filter((wish) => /奉献|财务|税/.test(`${wish.title}${wish.content}`)).reduce((sum, wish) => sum + wish.votes, 0)
        }
      ],
      recommendations: [
        { priority: 'P0', topic: '智能服侍排班', value: '高频、跨事工、直接影响主日执行。' },
        { priority: 'P0', topic: '税务凭证自动化', value: '强合规需求，可显著减少财务人工。' },
        { priority: 'P1', topic: '关怀随访', value: '提升新朋友与会友持续连接。' }
      ]
    });
  });

  router.post('/projects/export-document', (req, res) => {
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

    const users = database.read('users');
    const rows = database.read('wishes').map((wish) => {
      const author = users.find((user) => user.id === wish.user_id) || {};
      return [wish.id, wish.category, wish.title, wish.votes, author.nickname || '', author.church_name || '', wish.status]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',');
    });
    const content = `\ufeff"ID","分类","标题","票数","提交者","教会","状态"\n${rows.join('\n')}`;
    res.setHeader('Content-Disposition', 'attachment; filename="ChurchOS-Backlog.csv"');
    res.type('text/csv; charset=utf-8').send(content);
  });

  router.get('/projects/send-emails', (req, res) => {
    const users = database.read('users').filter((user) => !user.is_admin);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    users.forEach((user, index) => {
      res.write(`data: ${JSON.stringify({ index: index + 1, total: users.length, log: `已模拟发送至 ${user.nickname} (${user.email})` })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, log: `模拟发送完成，共 ${users.length} 封` })}\n\n`);
    res.end();
  });

  return router;
}

module.exports = { createAdminRouter };
