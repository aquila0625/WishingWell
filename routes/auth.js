const express = require('express');
const { authenticate } = require('../lib/http');
const { publicUser } = require('../lib/serializers');

const AVATAR_COLORS = [
  'linear-gradient(135deg, #2dd4bf, #2563eb)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #22c55e, #0891b2)',
  'linear-gradient(135deg, #38bdf8, #6366f1)',
  'linear-gradient(135deg, #f97316, #eab308)'
];

function createAuthRouter({ database, upload }) {
  const router = express.Router();
  const requireUser = authenticate(database);

  router.get('/churches/autocomplete', (req, res) => {
    const query = String(req.query.query || '').trim().toLowerCase();
    const city = String(req.query.city || '').trim().toLowerCase();
    const state = String(req.query.state || '').trim().toLowerCase();
    const churches = database.read('churches');
    const matches = churches
      .filter((church) => !query
        || church.name.toLowerCase().includes(query)
        || church.address.toLowerCase().includes(query))
      .sort((left, right) => {
        const score = (church) => {
          let value = 0;
          if (city && church.city.toLowerCase().includes(city)) value += 2;
          if (state && church.state.toLowerCase().includes(state)) value += 1;
          return value;
        };
        return score(right) - score(left);
      })
      .slice(0, 10);

    res.json(matches);
  });

  router.post('/auth/register', upload.single('avatar'), (req, res) => {
    const requiredFields = [
      'email', 'password', 'nickname', 'church_name',
      'country', 'state', 'city', 'role_category'
    ];
    const missing = requiredFields.find((field) => !String(req.body[field] || '').trim());
    if (missing) return res.status(400).json({ error: '请完整填写所有必填字段' });
    if (String(req.body.password).length < 6) {
      return res.status(400).json({ error: '密码至少需要 6 位字符' });
    }

    const email = String(req.body.email).trim().toLowerCase();
    const exists = database.read('users').some((user) => user.email.toLowerCase() === email);
    if (exists) return res.status(409).json({ error: '该邮箱已被注册' });

    const user = database.insert('users', {
      email,
      password: String(req.body.password),
      nickname: String(req.body.nickname).trim(),
      church_name: String(req.body.church_name).trim(),
      country: String(req.body.country).trim(),
      state: String(req.body.state).trim(),
      city: String(req.body.city).trim(),
      role_category: String(req.body.role_category).trim(),
      role_detail: String(req.body.role_detail || '').trim(),
      avatar_color: AVATAR_COLORS[database.read('users').length % AVATAR_COLORS.length],
      avatar_path: req.file ? `/uploads/${req.file.filename}` : null,
      is_admin: false
    });

    res.status(201).json({ message: '注册成功，请登录同工账号', user: publicUser(user) });
  });

  router.post('/auth/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: '请输入邮箱和密码' });

    const user = database.read('users').find((candidate) => (
      candidate.email.toLowerCase() === email && candidate.password === password
    ));
    if (!user) return res.status(401).json({ error: '邮箱或密码错误' });

    res.json({ message: '登录成功', user: publicUser(user) });
  });

  router.get('/auth/me', requireUser, (req, res) => res.json(publicUser(req.user)));

  return router;
}

module.exports = { createAuthRouter };
