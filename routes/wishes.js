const express = require('express');
const fs = require('node:fs/promises');
const { authenticate } = require('../lib/http');
const { publicUser } = require('../lib/serializers');
const { normalizeAdminContact } = require('../lib/admin-contact');

function createWishesRouter({
  database,
  upload,
  sessionSecret,
  openaiApiKey,
  openaiTranscriptionModel = 'gpt-4o-mini-transcribe',
  openaiFetchImpl = globalThis.fetch
}) {
  const router = express.Router();
  const requireUser = authenticate(database, { sessionSecret });

  async function addNotification(userId, type, message) {
    await database.insert('notifications', {
      user_id: Number(userId),
      type,
      message,
      read: false
    });
  }

  async function serializeWish(wish) {
    const author = await database.findById('users', wish.user_id);
    const comments = (await database.read('comments')).filter((comment) => comment.wish_id === wish.id);
    const voters = (await Promise.all((wish.voted_users || [])
      .slice(-3)
      .reverse()
      .map(async (userId) => publicUser(await database.findById('users', userId)))))
      .filter(Boolean);

    return {
      ...wish,
      author: publicUser(author),
      comment_count: comments.length,
      recent_voters: voters
    };
  }

  async function campaignClosed() {
    const settings = (await database.read('settings'))[0];
    return Boolean(settings?.enabled && settings.deadline && Date.now() >= Date.parse(settings.deadline));
  }

  async function rejectIfClosed(req, res, next) {
    if (await campaignClosed()) return res.status(423).json({ error: '本阶段需求征集已经截止' });
    next();
  }

  router.get('/wishes', async (req, res) => {
    const wishes = (await database.read('wishes')).filter((wish) => wish.status !== 'hidden');
    res.json(await Promise.all(wishes.map(serializeWish)));
  });

  router.get('/wishes/mine', requireUser, async (req, res) => {
    const settings = (await database.read('settings'))[0] || {};
    const wishes = (await database.read('wishes'))
      .filter((wish) => wish.user_id === req.user.id)
      .sort((left, right) => Number(right.created_at || right.id) - Number(left.created_at || left.id));
    res.json({
      items: await Promise.all(wishes.map(serializeWish)),
      admin_contact: normalizeAdminContact(settings.admin_contact)
    });
  });

  router.post('/wishes/check-similar', async (req, res) => {
    const title = String(req.body.title || '').trim().toLowerCase();
    if (title.length < 3) return res.json([]);
    const tokens = title.split(/[\s,./\\-]+/).filter((token) => token.length > 1);
    const matches = (await database.read('wishes'))
      .filter((wish) => wish.status !== 'merged' && wish.status !== 'hidden')
      .map((wish) => {
        const wishTitle = wish.title.toLowerCase();
        let score = wishTitle.includes(title) || title.includes(wishTitle) ? 10 : 0;
        for (const token of tokens) if (wishTitle.includes(token)) score += 2;
        return { wish, score };
      })
      .filter(({ score }) => score > 2)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ wish }) => wish);
    res.json(await Promise.all(matches.map(serializeWish)));
  });

  async function transcribeWithOpenAI(file) {
    if (!openaiApiKey) {
      const error = new Error('OpenAI 语音转录尚未配置，请先在服务端设置 OPENAI_API_KEY。');
      error.status = 503;
      error.publicMessage = error.message;
      throw error;
    }
    if (typeof openaiFetchImpl !== 'function') {
      const error = new Error('当前运行环境不支持服务端转录请求。');
      error.status = 500;
      error.publicMessage = error.message;
      throw error;
    }

    const audio = await fs.readFile(file.path);
    const form = new FormData();
    form.append('file', new Blob([audio], { type: file.mimetype || 'application/octet-stream' }), file.originalname || file.filename);
    form.append('model', openaiTranscriptionModel);

    const response = await openaiFetchImpl('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: form
    });

    if (!response.ok) {
      let message = 'OpenAI 语音转录失败，请稍后重试。';
      try {
        const payload = await response.json();
        message = payload?.error?.message || message;
      } catch (error) {
        try {
          message = await response.text() || message;
        } catch {}
      }
      const error = new Error(message);
      error.status = response.status || 502;
      error.publicMessage = message;
      throw error;
    }

    const payload = await response.json();
    return String(payload.text || '').trim();
  }

  router.post('/wishes/audio-transcribe', requireUser, upload.single('audio'), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: '请选择录音文件' });
    try {
      const text = await transcribeWithOpenAI(req.file);
      res.json({
        text,
        confidence: text ? 100 : 0,
        audioUrl: `/uploads/${req.file.filename}`
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/wishes', requireUser, rejectIfClosed, upload.array('images', 3), async (req, res) => {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const category = String(req.body.category || '').trim();
    if (!category) return res.status(400).json({ error: '请选择问题分类' });
    if (title.length < 5 || title.length > 30) return res.status(400).json({ error: '简短标题需要 5 至 30 个字' });
    if (content.length < 10) return res.status(400).json({ error: '问题描述至少需要 10 个字' });

    const today = new Date().setHours(0, 0, 0, 0);
    const submittedToday = (await database.read('wishes')).filter((wish) => (
      wish.user_id === req.user.id && Number(wish.created_at || 0) >= today
    ));
    if (submittedToday.length >= 3) return res.status(429).json({ error: '每位同工每天最多提交 3 条需求' });

    const wish = await database.insert('wishes', {
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
    res.status(201).json({ message: '需求提交成功', wish: await serializeWish(wish) });
  });

  router.patch('/wishes/:id', requireUser, async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.user_id !== req.user.id) return res.status(403).json({ error: '只能修改自己提交的需求' });
    if (wish.status !== 'voting') return res.status(409).json({ error: '该需求已被官方锁定，不能继续修改' });

    const category = String(req.body.category || '').trim();
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    if (!category) return res.status(400).json({ error: '请选择问题分类' });
    if (title.length < 5 || title.length > 30) return res.status(400).json({ error: '简短标题需要 5 至 30 个字' });
    if (content.length < 10) return res.status(400).json({ error: '问题描述至少需要 10 个字' });

    const updated = await database.update('wishes', wish.id, { category, title, content });
    res.json({ message: '需求已更新', wish: await serializeWish(updated) });
  });

  router.delete('/wishes/:id', requireUser, async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.user_id !== req.user.id) return res.status(403).json({ error: '只能撤回自己提交的需求' });
    if (['accepted', 'completed'].includes(wish.status)) return res.status(409).json({ error: '已采纳或完成的需求不能撤回' });
    await database.remove('wishes', wish.id);
    res.json({ message: '需求已撤回' });
  });

  router.post('/wishes/:id/vote', requireUser, rejectIfClosed, async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.status === 'hidden') return res.status(409).json({ error: '该需求已被屏蔽展示，不能继续助力' });
    const votedUsers = [...(wish.voted_users || [])];
    const index = votedUsers.indexOf(req.user.id);
    if (index === -1) {
      votedUsers.push(req.user.id);
      if (wish.user_id !== req.user.id) await addNotification(wish.user_id, 'vote', `${req.user.nickname} 对《${wish.title}》表示同感`);
    } else {
      votedUsers.splice(index, 1);
    }
    const updated = await database.update('wishes', wish.id, { voted_users: votedUsers, votes: votedUsers.length });
    res.json({ message: index === -1 ? '已表达同感' : '已取消同感', wish: await serializeWish(updated) });
  });

  router.get('/wishes/:id/voters', async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    const voters = await Promise.all((wish.voted_users || []).map(async (id) => publicUser(await database.findById('users', id))).filter(Boolean));
    res.json(voters.filter(Boolean));
  });

  router.post('/wishes/:id/comment', requireUser, rejectIfClosed, async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.status === 'hidden') return res.status(409).json({ error: '该需求已被屏蔽展示，不能继续评论' });
    const content = String(req.body.content || '').trim();
    if (content.length < 2) return res.status(400).json({ error: '评论至少需要 2 个字' });
    const parentId = req.body.parent_comment_id ? Number(req.body.parent_comment_id) : null;
    const comment = await database.insert('comments', {
      wish_id: wish.id,
      user_id: req.user.id,
      nickname: req.user.nickname,
      avatar_color: req.user.avatar_color,
      avatar_path: req.user.avatar_path || null,
      content,
      parent_comment_id: parentId,
      reply_to_nickname: String(req.body.reply_to_nickname || '').trim() || null
    });
    if (wish.user_id !== req.user.id) await addNotification(wish.user_id, 'comment', `${req.user.nickname} 评论了《${wish.title}》`);
    res.status(201).json({ message: '评论已发表', comment });
  });

  router.get('/wishes/:id/comments', async (req, res) => {
    const comments = (await database.read('comments')).filter((comment) => comment.wish_id === Number(req.params.id));
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

  router.post('/wishes/:id/dispute', requireUser, async (req, res) => {
    const wish = await database.findById('wishes', req.params.id);
    if (!wish) return res.status(404).json({ error: '未找到该需求' });
    if (wish.user_id !== req.user.id) return res.status(403).json({ error: '仅原作者可以发起拆分申诉' });
    if (wish.status !== 'merged') return res.status(409).json({ error: '该需求当前没有合并关系' });
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) return res.status(400).json({ error: '申诉理由至少需要 10 个字' });
    const updated = await database.update('wishes', wish.id, { dispute_reason: reason, dispute_status: 'pending' });
    await addNotification(1, 'dispute', `${req.user.nickname} 对《${wish.title}》发起拆分申诉`);
    res.json({ message: '拆分申诉已提交', wish: await serializeWish(updated) });
  });

  router.get('/notifications', requireUser, async (req, res) => {
    res.json((await database.read('notifications')).filter((notification) => notification.user_id === req.user.id));
  });

  router.post('/notifications/read-all', requireUser, async (req, res) => {
    const notifications = await database.read('notifications');
    await database.write('notifications', notifications.map((notification) => (
      notification.user_id === req.user.id ? { ...notification, read: true } : notification
    )));
    res.json({ message: '通知已全部标为已读' });
  });

  return router;
}

module.exports = { createWishesRouter };
