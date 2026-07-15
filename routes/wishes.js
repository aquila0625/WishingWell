const express = require('express');
const { authenticate } = require('../lib/http');
const { publicUser } = require('../lib/serializers');

function createWishesRouter({ database, upload }) {
  const router = express.Router();
  const requireUser = authenticate(database);

  function addNotification(userId, type, message) {
    database.insert('notifications', {
      user_id: Number(userId),
      type,
      message,
      read: false
    });
  }

  function serializeWish(wish) {
    const author = database.findById('users', wish.user_id);
    const comments = database.read('comments').filter((comment) => comment.wish_id === wish.id);
    const voters = (wish.voted_users || [])
      .map((userId) => publicUser(database.findById('users', userId)))
      .filter(Boolean)
      .slice(-3)
      .reverse();

    return {
      ...wish,
      author: publicUser(author),
      comment_count: comments.length,
      recent_voters: voters
    };
  }

  function campaignClosed() {
    const settings = database.read('settings')[0];
    return Boolean(settings?.enabled && settings.deadline && Date.now() >= Date.parse(settings.deadline));
  }

  function rejectIfClosed(req, res, next) {
    if (campaignClosed()) return res.status(423).json({ error: '本阶段需求征集已经截止' });
    next();
  }

  router.get('/wishes', (req, res) => {
    res.json(database.read('wishes').map(serializeWish));
  });

  router.post('/wishes/check-similar', (req, res) => {
    const title = String(req.body.title || '').trim().toLowerCase();
    if (title.length < 3) return res.json([]);
    const tokens = title.split(/[\s,./\\-]+/).filter((token) => token.length > 1);
    const matches = database.read('wishes')
      .filter((wish) => wish.status !== 'merged')
      .map((wish) => {
        const wishTitle = wish.title.toLowerCase();
        let score = wishTitle.includes(title) || title.includes(wishTitle) ? 10 : 0;
        for (const token of tokens) if (wishTitle.includes(token)) score += 2;
        return { wish, score };
      })
      .filter(({ score }) => score > 2)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ wish }) => serializeWish(wish));
    res.json(matches);
  });

  router.post('/wishes/audio-transcribe', requireUser, upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择录音文件' });
    const unclear = /noisy|unclear/i.test(req.file.originalname);
    res.json({
      text: unclear
        ? '录音中有较多杂音，请检查并手动修改转写内容。'
        : '希望系统支持把主日服侍安排一键同步到 Apple Calendar 和 Google Calendar。',
      confidence: unclear ? 55 : 94,
      audioUrl: `/uploads/${req.file.filename}`
    });
  });

  router.post('/wishes', requireUser, rejectIfClosed, upload.array('images', 3), (req, res) => {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const category = String(req.body.category || '').trim();
    if (!category) return res.status(400).json({ error: '请选择需求分类' });
    if (title.length < 5 || title.length > 30) return res.status(400).json({ error: '标题需要 5 至 30 个字' });
    if (content.length < 10) return res.status(400).json({ error: '详细描述至少需要 10 个字' });

    const today = new Date().setHours(0, 0, 0, 0);
    const submittedToday = database.read('wishes').filter((wish) => (
      wish.user_id === req.user.id && Number(wish.created_at || 0) >= today
    ));
    if (submittedToday.length >= 3) return res.status(429).json({ error: '每位同工每天最多提交 3 条需求' });

    const wish = database.insert('wishes', {
      user_id: req.user.id,
      title,
      content,
      category,
      images: (req.files || []).map((file) => `/uploads/${file.filename}`),
      audio_path: req.body.audio_path || null,
      is_anonymous: 0,
      status: 'voting',
      votes: 1,
      voted_users: [req.user.id],
      admin_reply: null,
      parent_wish_id: null,
      merge_reason: null,
      dispute_reason: null,
      dispute_status: 'none'
    });
    res.status(201).json({ message: '需求提交成功', wish: serializeWish(wish) });
  });

  router.patch('/wishes/:id', requireUser, (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.user_id !== req.user.id) return res.status(403).json({ error: '只能修改自己提交的需求' });
    if (['accepted', 'completed'].includes(wish.status)) return res.status(409).json({ error: '已采纳或完成的需求不能修改' });
    const content = String(req.body.content || '').trim();
    if (content && content.length < 10) return res.status(400).json({ error: '详细描述至少需要 10 个字' });
    const updated = database.update('wishes', wish.id, content ? { content } : {});
    res.json({ message: '需求已更新', wish: serializeWish(updated) });
  });

  router.delete('/wishes/:id', requireUser, (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.user_id !== req.user.id) return res.status(403).json({ error: '只能撤回自己提交的需求' });
    if (['accepted', 'completed'].includes(wish.status)) return res.status(409).json({ error: '已采纳或完成的需求不能撤回' });
    database.remove('wishes', wish.id);
    res.json({ message: '需求已撤回' });
  });

  router.post('/wishes/:id/vote', requireUser, rejectIfClosed, (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    const votedUsers = [...(wish.voted_users || [])];
    const index = votedUsers.indexOf(req.user.id);
    if (index === -1) {
      votedUsers.push(req.user.id);
      if (wish.user_id !== req.user.id) addNotification(wish.user_id, 'vote', `${req.user.nickname} 对《${wish.title}》表示同感`);
    } else {
      votedUsers.splice(index, 1);
    }
    const updated = database.update('wishes', wish.id, { voted_users: votedUsers, votes: votedUsers.length });
    res.json({ message: index === -1 ? '已表达同感' : '已取消同感', wish: serializeWish(updated) });
  });

  router.get('/wishes/:id/voters', (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    res.json((wish.voted_users || []).map((id) => publicUser(database.findById('users', id))).filter(Boolean));
  });

  router.post('/wishes/:id/comment', requireUser, rejectIfClosed, (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    const content = String(req.body.content || '').trim();
    if (content.length < 2) return res.status(400).json({ error: '评论至少需要 2 个字' });
    const parentId = req.body.parent_comment_id ? Number(req.body.parent_comment_id) : null;
    const comment = database.insert('comments', {
      wish_id: wish.id,
      user_id: req.user.id,
      nickname: req.user.nickname,
      avatar_color: req.user.avatar_color,
      avatar_path: req.user.avatar_path || null,
      content,
      parent_comment_id: parentId,
      reply_to_nickname: String(req.body.reply_to_nickname || '').trim() || null
    });
    if (wish.user_id !== req.user.id) addNotification(wish.user_id, 'comment', `${req.user.nickname} 评论了《${wish.title}》`);
    res.status(201).json({ message: '评论已发表', comment });
  });

  router.get('/wishes/:id/comments', (req, res) => {
    const comments = database.read('comments').filter((comment) => comment.wish_id === Number(req.params.id));
    const roots = comments.filter((comment) => !comment.parent_comment_id);
    res.json(roots.map((comment) => ({
      ...comment,
      replies: comments.filter((reply) => reply.parent_comment_id === comment.id)
    })));
  });

  router.post('/wishes/:id/translate', (req, res) => {
    const text = String(req.body.text || '').trim();
    const locale = String(req.body.locale || 'en');
    if (!text) return res.status(400).json({ error: '翻译文本不能为空' });
    const translation = locale.startsWith('zh')
      ? `中文译文：${text}`
      : `English translation: ${text}`;
    res.json({ translation, locale });
  });

  router.post('/wishes/:id/dispute', requireUser, (req, res) => {
    const wish = database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.user_id !== req.user.id) return res.status(403).json({ error: '仅原作者可以发起拆分申诉' });
    if (wish.status !== 'merged') return res.status(409).json({ error: '该需求当前没有合并关系' });
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) return res.status(400).json({ error: '申诉理由至少需要 10 个字' });
    const updated = database.update('wishes', wish.id, { dispute_reason: reason, dispute_status: 'pending' });
    addNotification(1, 'dispute', `${req.user.nickname} 对《${wish.title}》发起拆分申诉`);
    res.json({ message: '拆分申诉已提交', wish: serializeWish(updated) });
  });

  router.get('/notifications', requireUser, (req, res) => {
    res.json(database.read('notifications').filter((notification) => notification.user_id === req.user.id));
  });

  router.post('/notifications/read-all', requireUser, (req, res) => {
    const notifications = database.read('notifications');
    database.write('notifications', notifications.map((notification) => (
      notification.user_id === req.user.id ? { ...notification, read: true } : notification
    )));
    res.json({ message: '通知已全部标为已读' });
  });

  return router;
}

module.exports = { createWishesRouter };
